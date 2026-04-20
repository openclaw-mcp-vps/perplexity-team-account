import axios from "axios";
import { WebClient } from "@slack/web-api";
import { z } from "zod";

const perplexityResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1)
        })
      })
    )
    .min(1),
  citations: z.array(z.string()).optional()
});

export type PerplexityAnswer = {
  answer: string;
  citations: string[];
};

export async function queryPerplexity(input: { query: string }): Promise<PerplexityAnswer> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const model = process.env.PERPLEXITY_MODEL ?? "sonar-pro";
  const response = await axios.post(
    "https://api.perplexity.ai/chat/completions",
    {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant for startup operators. Return concise, factual answers with concrete recommendations and list relevant references when possible."
        },
        {
          role: "user",
          content: input.query
        }
      ],
      temperature: 0.2
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 45_000
    }
  );

  const parsed = perplexityResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error("Unexpected response shape from Perplexity API");
  }

  const choice = parsed.data.choices[0];
  return {
    answer: choice.message.content,
    citations: parsed.data.citations ?? []
  };
}

function buildSlackText(input: { query: string; answer: string; citations: string[]; requester: string }): string {
  const citationBlock = input.citations.length
    ? input.citations.map((citation, index) => `${index + 1}. ${citation}`).join("\n")
    : "No citations returned.";

  return [
    `*Perplexity Team Search*`,
    `*Requester:* ${input.requester}`,
    `*Query:* ${input.query}`,
    `*Answer:*\n${input.answer}`,
    `*Sources:*\n${citationBlock}`
  ].join("\n\n");
}

export async function shareToSlack(input: {
  channel: string;
  query: string;
  answer: string;
  citations: string[];
  requester: string;
}): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const slack = new WebClient(token);
  await slack.chat.postMessage({
    channel: input.channel,
    text: buildSlackText({
      query: input.query,
      answer: input.answer,
      citations: input.citations,
      requester: input.requester
    })
  });
}
