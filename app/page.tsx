import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CheckCircle2, ShieldCheck, Slack, TrendingDown, Users } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { LemonCheckoutButton } from "@/components/LemonCheckoutButton";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pooled Perplexity Pro for Startup Teams",
  description:
    "Perplexity Team lets startups share one Pro backend, track usage by seat, enforce monthly caps, and post clean answers to Slack."
};

const faqItems = [
  {
    question: "How is this cheaper than buying five individual AI subscriptions?",
    answer:
      "Most small teams pay for multiple overlapping AI tools. Perplexity Team consolidates research traffic through one managed proxy, so you pay a single $39/mo or $89/mo subscription instead of stacking per-user tool bills."
  },
  {
    question: "Do you track every search by user?",
    answer:
      "Yes. Every query is logged with timestamp and seat identity. You can see monthly usage by member, monitor burn rate, and keep budget accountability without reading private passwords or sharing one login."
  },
  {
    question: "What happens when a member reaches their monthly limit?",
    answer:
      "The API blocks that seat automatically and returns a limit message. Owners can upgrade plan capacity or redistribute seats, but the hard cap prevents surprise spend."
  },
  {
    question: "Can we share answers directly in Slack?",
    answer:
      "Yes. Team members can toggle Slack delivery per search. The proxy posts a structured summary with the original prompt and source links to your chosen channel."
  }
];

export default function HomePage(): React.ReactNode {
  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs font-medium text-[#4ea1ff]">
            ai-search | team proxy
          </span>

          <h1 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight text-[#e6edf3] sm:text-5xl">
            Perplexity Team
            <span className="block text-[#4ea1ff]">Pool Perplexity Pro across your team with usage tracking</span>
          </h1>

          <p className="max-w-2xl text-base leading-7 text-[#9ba7b4] sm:text-lg">
            We run a managed proxy between your team and Perplexity Pro. Every seat gets accountable usage, monthly caps are enforced automatically,
            and answers can ship to Slack in one click. You keep speed and quality while cutting redundant AI spend.
          </p>

          <div className="grid gap-3 text-sm text-[#9ba7b4] sm:grid-cols-2">
            <Card className="rounded-lg p-4">
              <p className="mb-1 font-semibold text-[#e6edf3]">Problem</p>
              <p>Startups are paying for 5 individual AI subscriptions with poor governance and no shared usage visibility.</p>
            </Card>
            <Card className="rounded-lg p-4">
              <p className="mb-1 font-semibold text-[#e6edf3]">Solution</p>
              <p>A pooled proxy gives one controlled search layer, per-seat limits, and collaborative output at fixed monthly cost.</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LemonCheckoutButton plan="starter">Start $39/mo (5 seats)</LemonCheckoutButton>
            <Link href="/search" className={buttonVariants({ variant: "outline" })}>
              Open Search App
            </Link>
          </div>
        </div>

        <AuthPanel />
      </section>

      <section className="space-y-5">
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3] sm:text-3xl">Why Teams Switch</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="surface rounded-xl p-5">
            <TrendingDown className="mb-3 h-5 w-5 text-[#3fb950]" />
            <h3 className="mb-2 font-semibold text-[#e6edf3]">Disruptive pricing</h3>
            <p className="text-sm text-[#9ba7b4]">Official team pricing starts around $200 for five seats. We deliver pooled value starting at $39/month.</p>
          </article>
          <article className="surface rounded-xl p-5">
            <BarChart3 className="mb-3 h-5 w-5 text-[#4ea1ff]" />
            <h3 className="mb-2 font-semibold text-[#e6edf3]">Per-seat accountability</h3>
            <p className="text-sm text-[#9ba7b4]">Track who asked what, monitor monthly usage per member, and see real consumption before upgrade decisions.</p>
          </article>
          <article className="surface rounded-xl p-5">
            <Slack className="mb-3 h-5 w-5 text-[#4ea1ff]" />
            <h3 className="mb-2 font-semibold text-[#e6edf3]">Slack-friendly output</h3>
            <p className="text-sm text-[#9ba7b4]">Share final answers and source links in team channels to speed product, GTM, and research workflows.</p>
          </article>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3] sm:text-3xl">Pricing</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="surface rounded-xl p-6">
            <p className="text-sm font-medium text-[#4ea1ff]">Starter</p>
            <h3 className="mt-1 text-3xl font-bold text-[#e6edf3]">$39/mo</h3>
            <p className="mt-2 text-sm text-[#9ba7b4]">5 seats, each with monthly search limits and full dashboard visibility.</p>
            <ul className="mt-4 space-y-2 text-sm text-[#9ba7b4]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                Search proxy + centralized usage logs
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                Monthly per-seat limit enforcement
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                Slack-ready response publishing
              </li>
            </ul>
            <div className="mt-5">
              <LemonCheckoutButton plan="starter" className="w-full rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb]">
                Choose Starter
              </LemonCheckoutButton>
            </div>
          </article>

          <article className="surface rounded-xl p-6">
            <p className="text-sm font-medium text-[#4ea1ff]">Growth</p>
            <h3 className="mt-1 text-3xl font-bold text-[#e6edf3]">$89/mo</h3>
            <p className="mt-2 text-sm text-[#9ba7b4]">15 seats for distributed teams managing product, support, and GTM workflows.</p>
            <ul className="mt-4 space-y-2 text-sm text-[#9ba7b4]">
              <li className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                3x seat capacity at low unit cost
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                Team-level usage governance and control
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#3fb950]" />
                Priority path for high-volume teams
              </li>
            </ul>
            <div className="mt-5">
              <LemonCheckoutButton plan="growth" className="w-full rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb]">
                Choose Growth
              </LemonCheckoutButton>
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3] sm:text-3xl">FAQ</h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <article key={item.question} className="surface rounded-xl p-5">
              <h3 className="text-base font-semibold text-[#e6edf3]">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-[#9ba7b4]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
