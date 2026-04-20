import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  addTeamMember,
  createSession,
  createTeamOwnerUser,
  deleteSession,
  findSession,
  findTeamById,
  findUserByEmail,
  findUserById,
  findUserWithPasswordByEmail,
  type TeamRecord,
  type UserRecord
} from "@/lib/database";

export const SESSION_COOKIE = "pt_session";
export const ACCESS_COOKIE = "pt_access";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthContext = {
  sessionToken: string;
  user: UserRecord;
  team: TeamRecord;
};

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerOwner(input: {
  email: string;
  name: string;
  password: string;
  teamName: string;
}): Promise<{ user: UserRecord; team: TeamRecord; sessionToken: string }> {
  const existing = findUserByEmail(input.email);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const { user, team } = createTeamOwnerUser({
    email: input.email,
    ownerName: input.name,
    passwordHash,
    teamName: input.teamName
  });

  const session = createSession(user.id);
  return {
    user,
    team,
    sessionToken: session.token
  };
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ user: UserRecord; team: TeamRecord; sessionToken: string }> {
  const existing = findUserWithPasswordByEmail(input.email);
  if (!existing) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await verifyPassword(input.password, existing.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const team = findTeamById(existing.teamId);
  if (!team) {
    throw new Error("Team is missing");
  }

  const session = createSession(existing.id);
  return {
    user: {
      id: existing.id,
      teamId: existing.teamId,
      email: existing.email,
      name: existing.name,
      role: existing.role,
      createdAt: existing.createdAt
    },
    team,
    sessionToken: session.token
  };
}

export async function addMemberAsOwner(input: {
  owner: UserRecord;
  ownerTeam: TeamRecord;
  memberName: string;
  memberEmail: string;
  memberPassword: string;
}): Promise<UserRecord> {
  if (input.owner.role !== "owner") {
    throw new Error("Only the team owner can add seats");
  }

  if (input.owner.id !== input.ownerTeam.ownerUserId) {
    throw new Error("Owner account mismatch");
  }

  const passwordHash = await hashPassword(input.memberPassword);
  return addTeamMember({
    teamId: input.owner.teamId,
    name: input.memberName,
    email: input.memberEmail,
    passwordHash
  });
}

export function setAuthCookies(response: NextResponse, input: { sessionToken: string; hasAccess: boolean }): void {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: SESSION_COOKIE,
    value: input.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });

  if (input.hasAccess) {
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS
    });
  } else {
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: "0",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0
    });
  }
}

export function clearAuthCookies(response: NextResponse): void {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0
  });

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0
  });
}

export function getSessionTokenFromRequest(request: Request): string | null {
  return parseCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
}

export function getAccessCookieFromRequest(request: Request): boolean {
  return parseCookieValue(request.headers.get("cookie"), ACCESS_COOKIE) === "1";
}

export function getAuthContextFromRequest(request: Request): AuthContext | null {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const session = findSession(token);
  if (!session) {
    return null;
  }

  const user = findUserById(session.userId);
  if (!user) {
    return null;
  }

  const team = findTeamById(user.teamId);
  if (!team) {
    return null;
  }

  return {
    sessionToken: token,
    user,
    team
  };
}

export async function getAuthContextFromCookies(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = findSession(token);
  if (!session) {
    return null;
  }

  const user = findUserById(session.userId);
  if (!user) {
    return null;
  }

  const team = findTeamById(user.teamId);
  if (!team) {
    return null;
  }

  return {
    sessionToken: token,
    user,
    team
  };
}

export async function hasPaidAccessFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value === "1";
}

export function hasPaidAccessInRequest(request: Request, teamIsPaid: boolean): boolean {
  if (!teamIsPaid) {
    return false;
  }

  return getAccessCookieFromRequest(request);
}

export function endSessionByToken(token: string): void {
  deleteSession(token);
}

export function createEphemeralStateToken(): string {
  return randomUUID();
}
