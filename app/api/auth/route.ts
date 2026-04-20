import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  addMemberAsOwner,
  clearAuthCookies,
  endSessionByToken,
  getAuthContextFromRequest,
  getSessionTokenFromRequest,
  loginWithPassword,
  registerOwner,
  setAuthCookies
} from "@/lib/auth";
import { PLAN_CONFIG, markTeamPaid, type PlanKey } from "@/lib/database";

const baseEmail = z.string().trim().email().max(160);
const basePassword = z.string().min(8).max(128);

const registerSchema = z.object({
  action: z.literal("register"),
  email: baseEmail,
  name: z.string().trim().min(2).max(80),
  password: basePassword,
  teamName: z.string().trim().min(2).max(100)
});

const loginSchema = z.object({
  action: z.literal("login"),
  email: baseEmail,
  password: basePassword
});

const addMemberSchema = z.object({
  action: z.literal("add-member"),
  name: z.string().trim().min(2).max(80),
  email: baseEmail,
  password: basePassword
});

const refreshSchema = z.object({
  action: z.literal("refresh-access")
});

const logoutSchema = z.object({
  action: z.literal("logout")
});

const simulatePurchaseSchema = z.object({
  action: z.literal("simulate-purchase"),
  plan: z.enum(["starter", "growth"]).default("starter")
});

const actionSchema = z.discriminatedUnion("action", [
  registerSchema,
  loginSchema,
  addMemberSchema,
  refreshSchema,
  logoutSchema,
  simulatePurchaseSchema
]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = getAuthContextFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: ctx.user,
    team: ctx.team,
    hasPaidAccessCookie: request.cookies.get(ACCESS_COOKIE)?.value === "1"
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let parsedBody: z.infer<typeof actionSchema>;

  try {
    const body = await request.json();
    parsedBody = actionSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    switch (parsedBody.action) {
      case "register": {
        const result = await registerOwner(parsedBody);
        const response = NextResponse.json({
          ok: true,
          user: result.user,
          team: result.team,
          requiresPayment: !result.team.isPaid
        });
        setAuthCookies(response, {
          sessionToken: result.sessionToken,
          hasAccess: result.team.isPaid
        });
        return response;
      }

      case "login": {
        const result = await loginWithPassword(parsedBody);
        const response = NextResponse.json({
          ok: true,
          user: result.user,
          team: result.team,
          requiresPayment: !result.team.isPaid
        });
        setAuthCookies(response, {
          sessionToken: result.sessionToken,
          hasAccess: result.team.isPaid
        });
        return response;
      }

      case "logout": {
        const token = getSessionTokenFromRequest(request);
        if (token) {
          endSessionByToken(token);
        }

        const response = NextResponse.json({ ok: true });
        clearAuthCookies(response);
        return response;
      }

      case "refresh-access": {
        const ctx = getAuthContextFromRequest(request);
        if (!ctx) {
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const response = NextResponse.json({
          ok: true,
          paid: ctx.team.isPaid
        });
        setAuthCookies(response, {
          sessionToken: ctx.sessionToken,
          hasAccess: ctx.team.isPaid
        });
        return response;
      }

      case "add-member": {
        const ctx = getAuthContextFromRequest(request);
        if (!ctx) {
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const member = await addMemberAsOwner({
          owner: ctx.user,
          ownerTeam: ctx.team,
          memberEmail: parsedBody.email,
          memberName: parsedBody.name,
          memberPassword: parsedBody.password
        });

        return NextResponse.json({
          ok: true,
          member
        });
      }

      case "simulate-purchase": {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
        }

        const ctx = getAuthContextFromRequest(request);
        if (!ctx) {
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        if (ctx.user.role !== "owner") {
          return NextResponse.json({ error: "Only owner can unlock" }, { status: 403 });
        }

        const planKey = parsedBody.plan as PlanKey;
        const plan = PLAN_CONFIG[planKey];

        const team = markTeamPaid({
          teamId: ctx.team.id,
          plan: planKey,
          seats: plan.seats,
          monthlyLimitPerSeat: plan.monthlyLimitPerSeat
        });

        const response = NextResponse.json({ ok: true, team });
        setAuthCookies(response, {
          sessionToken: ctx.sessionToken,
          hasAccess: true
        });
        return response;
      }

      default: {
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected authentication error"
      },
      { status: 400 }
    );
  }
}
