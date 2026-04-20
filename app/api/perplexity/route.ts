import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContextFromRequest, hasPaidAccessInRequest } from "@/lib/auth";
import { queryPerplexity, shareToSlack } from "@/lib/perplexity-client";
import { checkUserLimit, recordUsage } from "@/lib/usage-tracker";

const searchSchema = z.object({
  query: z.string().trim().min(4).max(4000),
  shareToSlack: z.boolean().optional().default(false),
  slackChannel: z.string().trim().min(2).max(120).optional()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = getAuthContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!hasPaidAccessInRequest(request, ctx.team.isPaid)) {
    return NextResponse.json(
      {
        error: "Payment required to use team search",
        requiresPayment: true
      },
      { status: 402 }
    );
  }

  let payload: z.infer<typeof searchSchema>;
  try {
    payload = searchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const usage = checkUserLimit({
    userId: ctx.user.id,
    monthlyLimitPerSeat: ctx.team.monthlyLimitPerSeat
  });

  if (usage.used >= usage.limit) {
    return NextResponse.json(
      {
        error: `Monthly seat limit reached (${usage.limit} searches)`,
        usage
      },
      { status: 429 }
    );
  }

  try {
    const result = await queryPerplexity({ query: payload.query });

    let slackShared = false;
    let slackError: string | null = null;

    if (payload.shareToSlack && payload.slackChannel) {
      try {
        await shareToSlack({
          channel: payload.slackChannel,
          query: payload.query,
          answer: result.answer,
          citations: result.citations,
          requester: ctx.user.email
        });
        slackShared = true;
      } catch (error) {
        slackError = error instanceof Error ? error.message : "Failed to publish to Slack";
      }
    }

    recordUsage({
      userId: ctx.user.id,
      teamId: ctx.team.id,
      query: payload.query,
      response: result.answer,
      slackShared
    });

    const refreshedUsage = checkUserLimit({
      userId: ctx.user.id,
      monthlyLimitPerSeat: ctx.team.monthlyLimitPerSeat
    });

    return NextResponse.json({
      ok: true,
      answer: result.answer,
      citations: result.citations,
      usage: refreshedUsage,
      slackShared,
      slackError
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Perplexity request failed"
      },
      { status: 500 }
    );
  }
}
