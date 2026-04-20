import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamManagement } from "@/components/TeamManagement";
import { UsageChart } from "@/components/UsageChart";
import { getAuthContextFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Usage Dashboard"
};

export default async function DashboardPage(): Promise<React.ReactNode> {
  const ctx = await getAuthContextFromCookies();
  if (!ctx) {
    redirect("/?auth=required");
  }

  return (
    <div className="space-y-6">
      <section className="surface rounded-xl p-5 sm:p-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[#e6edf3]">{ctx.team.name} Dashboard</h1>
        <p className="mt-2 text-sm text-[#9ba7b4]">
          Plan: <span className="text-[#e6edf3] capitalize">{ctx.team.plan}</span> · Seats: {ctx.team.seatLimit} · Access: {ctx.team.isPaid ? "Active" : "Pending payment"}
        </p>
      </section>

      <UsageChart />
      <TeamManagement />
    </div>
  );
}
