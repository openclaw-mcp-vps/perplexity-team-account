"use client";

import { FormEvent, useMemo, useState } from "react";
import { ExternalLink, Send, Slack, Sparkles } from "lucide-react";

type SearchInterfaceProps = {
  userName: string;
  teamName: string;
  monthlyLimitPerSeat: number;
};

type SearchResponse = {
  answer: string;
  citations: string[];
  usage: {
    used: number;
    limit: number;
    remaining: number;
    utilizationPct: number;
  };
  slackShared: boolean;
  slackError: string | null;
};

export function SearchInterface({ userName, teamName, monthlyLimitPerSeat }: SearchInterfaceProps): React.ReactNode {
  const [query, setQuery] = useState("");
  const [shareToSlack, setShareToSlack] = useState(false);
  const [slackChannel, setSlackChannel] = useState("#research");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);

  const usageText = useMemo(() => {
    if (!result?.usage) {
      return `Seat allowance: ${monthlyLimitPerSeat} searches/month`;
    }

    return `${result.usage.remaining} remaining this month (${result.usage.used}/${result.usage.limit})`;
  }, [monthlyLimitPerSeat, result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/perplexity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          shareToSlack,
          slackChannel
        })
      });

      const data = (await response.json()) as SearchResponse & { error?: string; requiresPayment?: boolean };
      if (!response.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface rounded-xl p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3]">Team Search Workspace</h1>
            <p className="mt-1 text-sm text-[#9ba7b4]">
              {teamName} · signed in as {userName}
            </p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#9ba7b4]">{usageText}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#e6edf3]">Ask Perplexity via your team proxy</span>
            <textarea
              required
              minLength={4}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: Compare top 3 GTM experiments for a seed-stage SaaS product in 2026, include expected cost and timeline."
              className="h-32 w-full resize-y rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#9ba7b4]">
              <input
                type="checkbox"
                checked={shareToSlack}
                onChange={(event) => setShareToSlack(event.target.checked)}
                className="h-4 w-4 accent-[#2f81f7]"
              />
              <Slack className="h-4 w-4" />
              Share answer to Slack
            </label>

            <input
              value={slackChannel}
              onChange={(event) => setSlackChannel(event.target.value)}
              disabled={!shareToSlack}
              className="w-full max-w-xs rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {loading ? "Running query..." : "Run Search"}
          </button>
        </form>
      </div>

      {result ? (
        <article className="surface rounded-xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-[#4ea1ff]">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Perplexity result</span>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-7 text-[#e6edf3]">{result.answer}</p>

          <div className="mt-5 space-y-2">
            <h3 className="text-sm font-semibold text-[#e6edf3]">Sources</h3>
            {result.citations.length === 0 ? (
              <p className="text-sm text-[#9ba7b4]">No source links were returned by the upstream model.</p>
            ) : (
              <ul className="space-y-2 text-sm text-[#9ba7b4]">
                {result.citations.map((citation) => (
                  <li key={citation}>
                    <a
                      href={citation}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 break-all text-[#4ea1ff] transition hover:text-[#79c0ff]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {citation}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-[#9ba7b4]">
            <span>
              Seat usage: {result.usage.used}/{result.usage.limit}
            </span>
            <span>{result.usage.remaining} searches remaining this month</span>
            <span>{result.slackShared ? "Shared to Slack" : "Not shared to Slack"}</span>
          </div>

          {result.slackError ? <p className="mt-3 text-xs text-[#f85149]">Slack delivery failed: {result.slackError}</p> : null}
        </article>
      ) : null}
    </div>
  );
}
