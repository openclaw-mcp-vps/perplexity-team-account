"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccessRefreshButton(): React.ReactNode {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRefresh(): Promise<void> {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "refresh-access" })
      });

      const data = (await response.json()) as { error?: string; paid?: boolean };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to refresh access");
      }

      setMessage(data.paid ? "Paid access active. Reloading..." : "Purchase not detected yet. Try again in 20 seconds.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh access");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="rounded-md border border-[#30363d] bg-[#161b22] px-4 py-2 text-sm text-[#e6edf3] transition hover:border-[#4ea1ff] hover:text-[#4ea1ff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Refreshing..." : "Refresh Access Cookie"}
      </button>
      {message ? <p className="text-sm text-[#9ba7b4]">{message}</p> : null}
    </div>
  );
}
