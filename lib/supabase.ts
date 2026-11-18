import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ASSIGNMENTS_KEY,
  DEFAULT_PARTICIPANTS,
  PARTICIPANTS_KEY,
  type Assignments,
  type OffDay,
  type Participant,
} from "./schedule";

/**
 * Lapisan data Rolling Libur.
 *
 * - Kalau NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY diisi,
 *   semua baca/tulis lewat Supabase (Postgres) — datanya sama di semua
 *   perangkat, bukan lagi per-perangkat.
 * - Kalau env belum diisi, fallback ke localStorage yang sudah ada
 *   (key rolling-libur:assignments:v1 / rolling-libur:participants:v1),
 *   supaya web tetap jalan lokal tanpa database.
 */

export type DataSource = "supabase" | "local";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export interface BoardData {
  participants: Participant[];
  assignments: Assignments;
  source: DataSource;
}

/* ---------- localStorage (fallback) ---------- */

function loadLocal(): BoardData {
  let participants = DEFAULT_PARTICIPANTS;
  let assignments: Assignments = {};
  try {
    const p = localStorage.getItem(PARTICIPANTS_KEY);
    if (p) {
      const parsed = JSON.parse(p) as Participant[];
      if (Array.isArray(parsed) && parsed.length === 14) participants = parsed;
    }
    const a = localStorage.getItem(ASSIGNMENTS_KEY);
    if (a) {
      const parsed = JSON.parse(a) as Assignments;
      if (parsed && typeof parsed === "object") assignments = parsed;
    }
  } catch {
    // localStorage rusak / tidak tersedia: pakai data default.
  }
  return { participants, assignments, source: "local" };
}

function saveLocalParticipants(participants: Participant[]) {
  try {
    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
  } catch {
    /* abaikan */
  }
}

function saveLocalAssignments(assignments: Assignments) {
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch {
    /* abaikan */
  }
}

/* ---------- Supabase ---------- */

interface ParticipantRow {
  id: string;
  name: string;
  division: Participant["division"];
  sort_order: number;
}

interface AssignmentRow {
  participant_id: string;
  week_start: string;
  off_day: OffDay;
}

async function loadFromSupabase(): Promise<BoardData> {
  const sb = getSupabase();
  if (!sb) return loadLocal();

  // Peserta: kalau tabel masih kosong (schema.sql belum dijalankan
  // dengan seed), isi dulu dengan 14 placeholder default.
  const { data: pRows, error: pErr } = await sb
    .from("participants")
    .select("id, name, division, sort_order")
    .order("sort_order", { ascending: true });
  if (pErr) throw pErr;

  let participants: Participant[];
  if (!pRows || pRows.length === 0) {
    const seed = DEFAULT_PARTICIPANTS.map((p, i) => ({
      id: p.id,
      name: p.name,
      division: p.division,
      sort_order: i + 1,
    }));
    const { error: seedErr } = await sb.from("participants").insert(seed);
    if (seedErr) throw seedErr;
    participants = DEFAULT_PARTICIPANTS;
  } else {
    participants = (pRows as ParticipantRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      division: r.division,
    }));
  }

  const { data: aRows, error: aErr } = await sb
    .from("assignments")
    .select("participant_id, week_start, off_day");
  if (aErr) throw aErr;

  const assignments: Assignments = {};
  for (const row of (aRows ?? []) as AssignmentRow[]) {
    if (!assignments[row.week_start]) assignments[row.week_start] = {};
    assignments[row.week_start][row.participant_id] = row.off_day;
  }
  return { participants, assignments, source: "supabase" };
}

/* ---------- API yang dipakai halaman ---------- */

export async function loadBoard(): Promise<BoardData> {
  if (!isSupabaseConfigured) return loadLocal();
  try {
    return await loadFromSupabase();
  } catch {
    // Supabase tidak terjangkau / tabel belum dibuat: jangan bikin
    // halaman blank — tampilkan data lokal sebagai cadangan.
    return loadLocal();
  }
}

export async function renameParticipant(
  id: string,
  name: string,
  participants: Participant[]
): Promise<void> {
  const next = participants.map((p) => (p.id === id ? { ...p, name } : p));
  if (!isSupabaseConfigured) {
    saveLocalParticipants(next);
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("participants").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function setOffDay(
  weekKey: string,
  participantId: string,
  day: OffDay,
  assignments: Assignments
): Promise<void> {
  const next: Assignments = {
    ...assignments,
    [weekKey]: { ...(assignments[weekKey] ?? {}), [participantId]: day },
  };
  if (!isSupabaseConfigured) {
    saveLocalAssignments(next);
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("assignments").upsert(
    { participant_id: participantId, week_start: weekKey, off_day: day },
    { onConflict: "participant_id,week_start" }
  );
  if (error) throw error;
}

export async function saveWeek(
  weekKey: string,
  weekMap: Record<string, OffDay>,
  assignments: Assignments
): Promise<void> {
  const next: Assignments = { ...assignments, [weekKey]: weekMap };
  if (!isSupabaseConfigured) {
    saveLocalAssignments(next);
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const rows = Object.entries(weekMap).map(([participant_id, off_day]) => ({
    participant_id,
    week_start: weekKey,
    off_day,
  }));
  if (rows.length === 0) return;
  const { error } = await sb
    .from("assignments")
    .upsert(rows, { onConflict: "participant_id,week_start" });
  if (error) throw error;
}

export async function clearWeek(weekKey: string, assignments: Assignments): Promise<void> {
  const next: Assignments = { ...assignments };
  delete next[weekKey];
  if (!isSupabaseConfigured) {
    saveLocalAssignments(next);
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("assignments").delete().eq("week_start", weekKey);
  if (error) throw error;
}
