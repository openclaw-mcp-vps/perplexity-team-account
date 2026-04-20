import { NextRequest, NextResponse } from "next/server";
import { getAuthContextFromRequest } from "@/lib/auth";
import { countTeamMembers, listInvites } from "@/lib/database";
import {
  buildSnapshot,
  checkUserLimit,
  getCurrentMonthKey,
  getTeamMonthlyUsage,
  listRecentQueries,
  listTeamMemberUsage,
  listTeamUsageSeries
} from "@/lib/usage-tracker";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = getAuthContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const monthKey = getCurrentMonthKey();
  const userUsage = checkUserLimit({
    userId: ctx.user.id,
    monthlyLimitPerSeat: ctx.team.monthlyLimitPerSeat,
    monthKey
  });

  const teamUsageCount = getTeamMonthlyUsage(ctx.team.id, monthKey);
  const teamLimit = ctx.team.monthlyLimitPerSeat * ctx.team.seatLimit;

  return NextResponse.json({
    monthKey,
    user: ctx.user,
    team: {
      ...ctx.team,
      memberCount: countTeamMembers(ctx.team.id),
      invites: listInvites(ctx.team.id)
    },
    usage: {
      user: userUsage,
      team: buildSnapshot(teamUsageCount, teamLimit)
    },
    chart: listTeamUsageSeries(ctx.team.id, 6),
    members: listTeamMemberUsage(ctx.team.id, monthKey),
    recentQueries: listRecentQueries(ctx.team.id, 12)
  });
}
