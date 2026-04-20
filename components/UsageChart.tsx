"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type UsageResponse = {
  monthKey: string;
  usage: {
    user: {
      used: number;
      limit: number;
      remaining: number;
      utilizationPct: number;
    };
    team: {
      used: number;
      limit: number;
      remaining: number;
      utilizationPct: number;
    };
  };
  chart: Array<{ month: string; queries: number }>;
};

export function UsageChart(): React.ReactNode {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsage(): Promise<void> {
      try {
        const response = await fetch("/api/usage", { cache: "no-store" });
        const payload = (await response.json()) as UsageResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load usage");
        }

        setData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load usage");
      }
    }

    void loadUsage();
  }, []);

  const chartData = useMemo(() => data?.chart ?? [], [data?.chart]);

  if (error) {
    return <p className="text-sm text-[#f85149]">{error}</p>;
  }

  return (
    <section className="surface rounded-xl p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[#e6edf3]">Usage Overview</h2>
          <p className="mt-1 text-sm text-[#9ba7b4]">Monthly usage trend and current seat utilization.</p>
        </div>
        <BarChart3 className="h-5 w-5 text-[#4ea1ff]" />
      </div>

      {data ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <article className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
              <p className="text-xs uppercase tracking-wide text-[#9ba7b4]">Your seat</p>
              <p className="mt-1 text-2xl font-semibold text-[#e6edf3]">
                {data.usage.user.used}/{data.usage.user.limit}
              </p>
              <p className="text-sm text-[#9ba7b4]">{data.usage.user.remaining} searches remaining this month</p>
            </article>
            <article className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
              <p className="text-xs uppercase tracking-wide text-[#9ba7b4]">Team pool</p>
              <p className="mt-1 text-2xl font-semibold text-[#e6edf3]">
                {data.usage.team.used}/{data.usage.team.limit}
              </p>
              <p className="text-sm text-[#9ba7b4]">{data.usage.team.remaining} searches remaining this month</p>
            </article>
          </div>

          <div className="h-64 w-full rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            {chartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[#9ba7b4]">
                <Activity className="mr-2 h-4 w-4" />
                Run searches to populate your monthly usage chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="month" stroke="#9ba7b4" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9ba7b4" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(47, 129, 247, 0.1)" }}
                    contentStyle={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "8px",
                      color: "#e6edf3"
                    }}
                  />
                  <Bar dataKey="queries" fill="#2f81f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-[#9ba7b4]">Loading usage data...</p>
      )}
    </section>
  );
}
