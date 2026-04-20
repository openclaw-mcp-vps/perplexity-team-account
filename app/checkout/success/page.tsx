import type { Metadata } from "next";
import Link from "next/link";
import { AccessRefreshButton } from "@/components/AccessRefreshButton";

export const metadata: Metadata = {
  title: "Checkout Confirmation"
};

export default function CheckoutSuccessPage(): React.ReactNode {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="surface rounded-xl p-6 sm:p-7">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3]">Checkout Completed</h1>
        <p className="mt-3 text-sm leading-7 text-[#9ba7b4]">
          If your payment succeeded, Lemon Squeezy sends a webhook to this app. Once the webhook is received, your workspace is marked paid and
          search access is unlocked.
        </p>

        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#9ba7b4]">
          <li>Stay logged in with the same account email used during purchase.</li>
          <li>Click refresh to update your paid access cookie.</li>
          <li>Open the search app and run your first team query.</li>
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <AccessRefreshButton />
          <Link
            href="/search"
            className="rounded-md border border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-semibold text-[#e6edf3] transition hover:border-[#4ea1ff] hover:text-[#4ea1ff]"
          >
            Go to Search
          </Link>
        </div>
      </section>
    </div>
  );
}
