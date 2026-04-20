import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessRefreshButton } from "@/components/AccessRefreshButton";
import { DevUnlockButton } from "@/components/DevUnlockButton";
import { LemonCheckoutButton } from "@/components/LemonCheckoutButton";
import { SearchInterface } from "@/components/SearchInterface";
import { getAuthContextFromCookies, hasPaidAccessFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Team Search"
};

export default async function SearchPage(): Promise<React.ReactNode> {
  const ctx = await getAuthContextFromCookies();
  if (!ctx) {
    redirect("/?auth=required");
  }

  const hasPaidCookie = await hasPaidAccessFromCookies();

  if (!ctx.team.isPaid || !hasPaidCookie) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="surface rounded-xl p-6 sm:p-7">
          <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3]">Search is currently locked</h1>
          <p className="mt-3 text-sm leading-7 text-[#9ba7b4]">
            This workspace has authenticated users, but active paid access is required before proxy queries can run. Complete checkout,
            wait for the Lemon Squeezy webhook to confirm payment, then refresh your access cookie.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <LemonCheckoutButton plan="starter" className="rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb]">
              Checkout Starter ($39/mo)
            </LemonCheckoutButton>
            <LemonCheckoutButton plan="growth" className="rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb]">
              Checkout Growth ($89/mo)
            </LemonCheckoutButton>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AccessRefreshButton />
            <DevUnlockButton plan="starter" />
            <Link href="/checkout/success" className="text-sm text-[#4ea1ff] transition hover:text-[#79c0ff]">
              Open purchase confirmation helper
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <SearchInterface userName={ctx.user.name} teamName={ctx.team.name} monthlyLimitPerSeat={ctx.team.monthlyLimitPerSeat} />;
}
