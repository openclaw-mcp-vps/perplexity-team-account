import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import BetterSqlite3, { type Database as SqliteDatabase } from "better-sqlite3";

export type PlanKey = "starter" | "growth";

export const PLAN_CONFIG: Record<PlanKey, { label: string; seats: number; monthlyLimitPerSeat: number; monthlyPrice: number }> = {
  starter: {
    label: "Starter",
    seats: 5,
    monthlyLimitPerSeat: 350,
    monthlyPrice: 39
  },
  growth: {
    label: "Growth",
    seats: 15,
    monthlyLimitPerSeat: 900,
    monthlyPrice: 89
  }
};

export type UserRecord = {
  id: string;
  teamId: string;
  email: string;
  name: string;
  role: "owner" | "member";
  createdAt: number;
};

export type TeamRecord = {
  id: string;
  name: string;
  plan: PlanKey;
  seatLimit: number;
  monthlyLimitPerSeat: number;
  isPaid: boolean;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
};

export type SessionRecord = {
  token: string;
  userId: string;
  expiresAt: number;
};

let db: SqliteDatabase | null = null;

function databasePath(): string {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "perplexity-team.sqlite");
}

function getDb(): SqliteDatabase {
  if (db) {
    return db;
  }

  db = new BetterSqlite3(databasePath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT NOT NULL,
      seat_limit INTEGER NOT NULL,
      monthly_limit_per_seat INTEGER NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      owner_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      query_text TEXT NOT NULL,
      response_text TEXT NOT NULL,
      slack_shared INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      lemon_order_id TEXT UNIQUE,
      email TEXT NOT NULL,
      plan TEXT NOT NULL,
      seats INTEGER NOT NULL,
      monthly_limit_per_seat INTEGER NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(team_id, email),
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage_events (user_id, month_key);
    CREATE INDEX IF NOT EXISTS idx_usage_team_month ON usage_events (team_id, month_key);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at);
  `);

  return db;
}

function normalizePlan(plan: string | null | undefined): PlanKey {
  if (plan === "growth") {
    return "growth";
  }
  return "starter";
}

function mapUser(row: {
  id: string;
  team_id: string;
  email: string;
  name: string;
  role: "owner" | "member";
  created_at: number;
}): UserRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at
  };
}

function mapTeam(row: {
  id: string;
  name: string;
  plan: string;
  seat_limit: number;
  monthly_limit_per_seat: number;
  is_paid: number;
  owner_user_id: string;
  created_at: number;
  updated_at: number;
}): TeamRecord {
  return {
    id: row.id,
    name: row.name,
    plan: normalizePlan(row.plan),
    seatLimit: row.seat_limit,
    monthlyLimitPerSeat: row.monthly_limit_per_seat,
    isPaid: Boolean(row.is_paid),
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createTeamOwnerUser(input: {
  teamName: string;
  ownerName: string;
  email: string;
  passwordHash: string;
}): { user: UserRecord; team: TeamRecord } {
  const now = Date.now();
  const teamId = randomUUID();
  const userId = randomUUID();
  const plan = PLAN_CONFIG.starter;

  const database = getDb();
  const transaction = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO teams (
          id, name, plan, seat_limit, monthly_limit_per_seat, is_paid, owner_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .run(teamId, input.teamName, "starter", plan.seats, plan.monthlyLimitPerSeat, userId, now, now);

    database
      .prepare(`INSERT INTO users (id, team_id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, 'owner', ?)`)
      .run(userId, teamId, input.email.toLowerCase(), input.ownerName, input.passwordHash, now);

    database
      .prepare("INSERT INTO invites (id, team_id, email, role, status, created_at) VALUES (?, ?, ?, 'owner', 'accepted', ?)")
      .run(randomUUID(), teamId, input.email.toLowerCase(), now);
  });

  transaction();

  const user = findUserById(userId);
  const team = findTeamById(teamId);

  if (!user || !team) {
    throw new Error("Failed to bootstrap team account");
  }

  return { user, team };
}

export function addTeamMember(input: {
  teamId: string;
  name: string;
  email: string;
  passwordHash: string;
}): UserRecord {
  const database = getDb();
  const normalizedEmail = input.email.toLowerCase();

  const existing = database.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const team = findTeamById(input.teamId);
  if (!team) {
    throw new Error("Team not found");
  }

  const seatCount = countTeamMembers(input.teamId);
  if (seatCount >= team.seatLimit) {
    throw new Error(`Seat limit reached (${team.seatLimit})`);
  }

  const userId = randomUUID();
  const now = Date.now();

  database
    .prepare(`INSERT INTO users (id, team_id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, 'member', ?)`)
    .run(userId, input.teamId, normalizedEmail, input.name, input.passwordHash, now);

  database
    .prepare(
      "INSERT INTO invites (id, team_id, email, role, status, created_at) VALUES (?, ?, ?, 'member', 'accepted', ?) ON CONFLICT(team_id, email) DO UPDATE SET status='accepted'"
    )
    .run(randomUUID(), input.teamId, normalizedEmail, now);

  const user = findUserById(userId);
  if (!user) {
    throw new Error("Failed to add team member");
  }

  return user;
}

export function findUserWithPasswordByEmail(email: string): (UserRecord & { passwordHash: string }) | null {
  const database = getDb();
  const row = database
    .prepare("SELECT id, team_id, email, name, role, created_at, password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | {
        id: string;
        team_id: string;
        email: string;
        name: string;
        role: "owner" | "member";
        created_at: number;
        password_hash: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  const user = mapUser(row);
  return {
    ...user,
    passwordHash: row.password_hash
  };
}

export function findUserById(userId: string): UserRecord | null {
  const database = getDb();
  const row = database
    .prepare("SELECT id, team_id, email, name, role, created_at FROM users WHERE id = ?")
    .get(userId) as
    | {
        id: string;
        team_id: string;
        email: string;
        name: string;
        role: "owner" | "member";
        created_at: number;
      }
    | undefined;

  return row ? mapUser(row) : null;
}

export function findUserByEmail(email: string): UserRecord | null {
  const database = getDb();
  const row = database
    .prepare("SELECT id, team_id, email, name, role, created_at FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | {
        id: string;
        team_id: string;
        email: string;
        name: string;
        role: "owner" | "member";
        created_at: number;
      }
    | undefined;

  return row ? mapUser(row) : null;
}

export function findTeamById(teamId: string): TeamRecord | null {
  const database = getDb();
  const row = database
    .prepare(
      "SELECT id, name, plan, seat_limit, monthly_limit_per_seat, is_paid, owner_user_id, created_at, updated_at FROM teams WHERE id = ?"
    )
    .get(teamId) as
    | {
        id: string;
        name: string;
        plan: string;
        seat_limit: number;
        monthly_limit_per_seat: number;
        is_paid: number;
        owner_user_id: string;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  return row ? mapTeam(row) : null;
}

export function findTeamByOwnerEmail(email: string): TeamRecord | null {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT t.id, t.name, t.plan, t.seat_limit, t.monthly_limit_per_seat, t.is_paid, t.owner_user_id, t.created_at, t.updated_at
       FROM teams t
       JOIN users u ON u.id = t.owner_user_id
       WHERE u.email = ?`
    )
    .get(email.toLowerCase()) as
    | {
        id: string;
        name: string;
        plan: string;
        seat_limit: number;
        monthly_limit_per_seat: number;
        is_paid: number;
        owner_user_id: string;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  return row ? mapTeam(row) : null;
}

export function listTeamMembers(teamId: string): UserRecord[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT id, team_id, email, name, role, created_at FROM users WHERE team_id = ? ORDER BY created_at ASC")
    .all(teamId) as Array<{
    id: string;
    team_id: string;
    email: string;
    name: string;
    role: "owner" | "member";
    created_at: number;
  }>;

  return rows.map(mapUser);
}

export function countTeamMembers(teamId: string): number {
  const database = getDb();
  const row = database.prepare("SELECT COUNT(*) AS count FROM users WHERE team_id = ?").get(teamId) as { count: number };
  return row.count;
}

export function createSession(userId: string, maxAgeDays = 30): SessionRecord {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + maxAgeDays * 24 * 60 * 60 * 1000;

  const database = getDb();
  database.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(token, userId, expiresAt, now);
  pruneExpiredSessions();

  return { token, userId, expiresAt };
}

export function findSession(token: string): SessionRecord | null {
  const database = getDb();
  const row = database
    .prepare("SELECT token, user_id, expires_at FROM sessions WHERE token = ?")
    .get(token) as { token: string; user_id: string; expires_at: number } | undefined;

  if (!row) {
    return null;
  }

  if (row.expires_at <= Date.now()) {
    deleteSession(token);
    return null;
  }

  return {
    token: row.token,
    userId: row.user_id,
    expiresAt: row.expires_at
  };
}

export function deleteSession(token: string): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function pruneExpiredSessions(): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
}

export function markTeamPaid(input: {
  teamId: string;
  plan: PlanKey;
  seats: number;
  monthlyLimitPerSeat: number;
}): TeamRecord {
  const database = getDb();
  const now = Date.now();

  database
    .prepare(
      "UPDATE teams SET is_paid = 1, plan = ?, seat_limit = ?, monthly_limit_per_seat = ?, updated_at = ? WHERE id = ?"
    )
    .run(input.plan, input.seats, input.monthlyLimitPerSeat, now, input.teamId);

  const team = findTeamById(input.teamId);
  if (!team) {
    throw new Error("Team not found after payment update");
  }

  return team;
}

export function applyPurchaseToTeamByEmail(input: {
  email: string;
  lemonOrderId: string;
  plan: PlanKey;
  seats: number;
  monthlyLimitPerSeat: number;
  status: string;
  payloadJson: string;
}): { activated: boolean; teamId: string | null } {
  const database = getDb();
  const now = Date.now();
  const normalizedEmail = input.email.toLowerCase();

  const transaction = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO purchases (
          id, lemon_order_id, email, plan, seats, monthly_limit_per_seat, status, payload_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lemon_order_id)
        DO UPDATE SET
          email = excluded.email,
          plan = excluded.plan,
          seats = excluded.seats,
          monthly_limit_per_seat = excluded.monthly_limit_per_seat,
          status = excluded.status,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at`
      )
      .run(
        randomUUID(),
        input.lemonOrderId,
        normalizedEmail,
        input.plan,
        input.seats,
        input.monthlyLimitPerSeat,
        input.status,
        input.payloadJson,
        now,
        now
      );

    const user = findUserByEmail(normalizedEmail);
    if (!user) {
      return { activated: false, teamId: null as string | null };
    }

    markTeamPaid({
      teamId: user.teamId,
      plan: input.plan,
      seats: input.seats,
      monthlyLimitPerSeat: input.monthlyLimitPerSeat
    });

    return { activated: true, teamId: user.teamId };
  });

  return transaction();
}

export function createInvite(input: { teamId: string; email: string; role?: "owner" | "member" }): void {
  const database = getDb();
  database
    .prepare(
      "INSERT INTO invites (id, team_id, email, role, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?) ON CONFLICT(team_id, email) DO UPDATE SET status='pending', role=excluded.role"
    )
    .run(randomUUID(), input.teamId, input.email.toLowerCase(), input.role ?? "member", Date.now());
}

export function listInvites(teamId: string): Array<{ email: string; role: string; status: string; createdAt: number }> {
  const database = getDb();
  return database
    .prepare("SELECT email, role, status, created_at FROM invites WHERE team_id = ? ORDER BY created_at DESC")
    .all(teamId)
    .map((row) => ({
      email: (row as { email: string }).email,
      role: (row as { role: string }).role,
      status: (row as { status: string }).status,
      createdAt: (row as { created_at: number }).created_at
    }));
}

export function getDatabase(): SqliteDatabase {
  return getDb();
}
