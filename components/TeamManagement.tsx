"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";

type UsageResponse = {
  team: {
    seatLimit: number;
    memberCount: number;
    isPaid: boolean;
  };
  user: {
    role: "owner" | "member";
  };
  members: Array<{
    userId: string;
    name: string;
    email: string;
    role: "owner" | "member";
    queriesUsed: number;
  }>;
};

export function TeamManagement(): React.ReactNode {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      const payload = (await response.json()) as UsageResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load team info");
      }

      setData(payload);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load team info");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const ownerView = useMemo(() => data?.user.role === "owner", [data?.user.role]);

  async function addMember(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      action: "add-member",
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? "")
    };

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to add member");
      }

      setMessage("Member added successfully.");
      (event.currentTarget as HTMLFormElement).reset();
      await loadData();
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return <p className="text-sm text-[#f85149]">{error}</p>;
  }

  return (
    <section className="surface rounded-xl p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[#e6edf3]">Team Management</h2>
          <p className="mt-1 text-sm text-[#9ba7b4]">Monitor seat utilization and onboard teammates.</p>
        </div>
        <Users className="h-5 w-5 text-[#4ea1ff]" />
      </div>

      {data ? (
        <>
          <div className="mb-4 rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#9ba7b4]">
            Seats used: <span className="font-semibold text-[#e6edf3]">{data.team.memberCount}</span> / {data.team.seatLimit}
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#30363d]">
            <table className="min-w-full divide-y divide-[#30363d] text-sm">
              <thead className="bg-[#0d1117] text-[#9ba7b4]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Member</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Queries (month)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] bg-[#161b22]/60 text-[#e6edf3]">
                {data.members.map((member) => (
                  <tr key={member.userId}>
                    <td className="px-3 py-2">
                      <p>{member.name}</p>
                      <p className="text-xs text-[#9ba7b4]">{member.email}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-[#9ba7b4]">{member.role}</td>
                    <td className="px-3 py-2">{member.queriesUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ownerView ? (
            <form onSubmit={addMember} className="mt-5 space-y-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#e6edf3]">
                <UserPlus className="h-4 w-4 text-[#4ea1ff]" />
                Add teammate seat
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  name="name"
                  placeholder="Full name"
                  className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
                />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="work@company.com"
                  className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
                />
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="Temporary password"
                  className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Adding member..." : "Add member"}
              </button>
              {message ? <p className="text-sm text-[#9ba7b4]">{message}</p> : null}
            </form>
          ) : (
            <p className="mt-4 text-sm text-[#9ba7b4]">Only the owner can add members.</p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#9ba7b4]">Loading team members...</p>
      )}
    </section>
  );
}
