"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn } from "lucide-react";

type Mode = "login" | "register";

type ApiError = {
  error?: string;
};

export function AuthPanel(): React.ReactNode {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => (mode === "login" ? "Sign in to your workspace" : "Create your team workspace"), [mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    const payload =
      mode === "login"
        ? {
            action: "login",
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? "")
          }
        : {
            action: "register",
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            name: String(form.get("name") ?? ""),
            teamName: String(form.get("teamName") ?? "")
          };

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json()) as ApiError;
        throw new Error(data.error ?? "Authentication failed");
      }

      router.push("/search");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface rounded-xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full border border-[#30363d] bg-[#161b22] p-2 text-[#4ea1ff]">
          <KeyRound className="h-4 w-4" />
        </span>
        <h3 className="font-[var(--font-heading)] text-base font-semibold text-[#e6edf3]">{title}</h3>
      </div>

      <div className="mb-4 flex gap-2 rounded-lg border border-[#30363d] bg-[#0d1117] p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md px-3 py-2 transition ${
            mode === "login" ? "bg-[#1f6feb] text-white" : "text-[#9ba7b4] hover:text-[#e6edf3]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-md px-3 py-2 transition ${
            mode === "register" ? "bg-[#1f6feb] text-white" : "text-[#9ba7b4] hover:text-[#e6edf3]"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "register" ? (
          <>
            <input
              required
              name="name"
              autoComplete="name"
              placeholder="Your name"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
            />
            <input
              required
              name="teamName"
              placeholder="Team name (e.g. Acme Product)"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
            />
          </>
        ) : null}

        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Work email"
          className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
        />

        <input
          required
          type="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Password (8+ chars)"
          className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] outline-none transition focus:border-[#4ea1ff]"
        />

        {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          {loading ? "Working..." : mode === "login" ? "Sign in" : "Create workspace"}
        </button>
      </form>

      <p className="mt-3 text-xs text-[#9ba7b4]">
        Search is paywalled. After checkout, login again or click "refresh access" in the app to update your paid cookie.
      </p>
    </div>
  );
}
