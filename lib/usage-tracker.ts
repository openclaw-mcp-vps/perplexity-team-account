import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database";

export type UsageSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  utilizationPct: number;
};

export function getCurrentMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getUserMonthlyUsage(userId: string, monthKey = getCurrentMonthKey()): number {
  const db = getDatabase();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM usage_events WHERE user_id = ? AND month_key = ?")
    .get(userId, monthKey) as { count: number };

  return row.count;
}

export function getTeamMonthlyUsage(teamId: string, monthKey = getCurrentMonthKey()): number {
  const db = getDatabase();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM usage_events WHERE team_id = ? AND month_key = ?")
    .get(teamId, monthKey) as { count: number };

  return row.count;
}

export function buildSnapshot(used: number, limit: number): UsageSnapshot {
  const safeLimit = Math.max(limit, 1);
  const remaining = Math.max(limit - used, 0);
  const utilizationPct = Math.min(100, Math.round((used / safeLimit) * 100));

  return {
    used,
    limit,
    remaining,
    utilizationPct
  };
}

export function checkUserLimit(input: {
  userId: string;
  monthlyLimitPerSeat: number;
  monthKey?: string;
}): UsageSnapshot {
  const used = getUserMonthlyUsage(input.userId, input.monthKey ?? getCurrentMonthKey());
  return buildSnapshot(used, input.monthlyLimitPerSeat);
}

export function recordUsage(input: {
  userId: string;
  teamId: string;
  query: string;
  response: string;
  slackShared?: boolean;
  createdAt?: number;
}): void {
  const db = getDatabase();
  const createdAt = input.createdAt ?? Date.now();
  const monthKey = getCurrentMonthKey(new Date(createdAt));

  db.prepare(
    `INSERT INTO usage_events (
      id, user_id, team_id, month_key, query_text, response_text, slack_shared, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    input.userId,
    input.teamId,
    monthKey,
    input.query,
    input.response,
    input.slackShared ? 1 : 0,
    createdAt
  );
}

export function listTeamUsageSeries(teamId: string, monthCount = 6): Array<{ month: string; queries: number }> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT month_key, COUNT(*) AS count
       FROM usage_events
       WHERE team_id = ?
       GROUP BY month_key
       ORDER BY month_key DESC
       LIMIT ?`
    )
    .all(teamId, monthCount) as Array<{ month_key: string; count: number }>;

  return [...rows]
    .reverse()
    .map((row) => ({
      month: row.month_key,
      queries: row.count
    }));
}

export function listTeamMemberUsage(teamId: string, monthKey = getCurrentMonthKey()): Array<{
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
  queriesUsed: number;
}> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT u.id AS user_id, u.name, u.email, u.role, COUNT(e.id) AS queries_used
       FROM users u
       LEFT JOIN usage_events e
         ON e.user_id = u.id
        AND e.month_key = ?
       WHERE u.team_id = ?
       GROUP BY u.id, u.name, u.email, u.role
       ORDER BY u.role ASC, u.name ASC`
    )
    .all(monthKey, teamId) as Array<{
    user_id: string;
    name: string;
    email: string;
    role: "owner" | "member";
    queries_used: number;
  }>;

  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    queriesUsed: row.queries_used
  }));
}

export function listRecentQueries(teamId: string, limit = 10): Array<{
  id: string;
  query: string;
  createdAt: number;
  by: string;
}> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT e.id, e.query_text, e.created_at, u.name
       FROM usage_events e
       JOIN users u ON u.id = e.user_id
       WHERE e.team_id = ?
       ORDER BY e.created_at DESC
       LIMIT ?`
    )
    .all(teamId, limit) as Array<{ id: string; query_text: string; created_at: number; name: string }>;

  return rows.map((row) => ({
    id: row.id,
    query: row.query_text,
    createdAt: row.created_at,
    by: row.name
  }));
}
