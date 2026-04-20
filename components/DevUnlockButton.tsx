"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DevUnlockButtonProps = {
  plan: "starter" | "growth";
};

export function DevUnlockButton({ plan }: DevUnlockButtonProps): React.ReactNode {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onClick(): Promise<void> {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "simulate-purchase", plan })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to unlock in development");
      }

      setMessage("Development unlock enabled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to unlock in development");
    } finally {
      setLoading(false);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-md border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-[#9ba7b4] transition hover:border-[#3fb950] hover:text-[#3fb950]"
      >
        {loading ? "Unlocking..." : `Dev unlock (${plan})`}
      </button>
      {message ? <p className="text-xs text-[#9ba7b4]">{message}</p> : null}
    </div>
  );
}
