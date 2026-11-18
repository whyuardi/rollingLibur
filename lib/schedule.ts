export type Division = "Mobile" | "Web" | "Analyst";
export type OffDay = "fri" | "sat";

export interface Participant {
  id: string;
  name: string;
  division: Division;
}

export const DIVISIONS: { key: Division; label: string; short: string; size: number }[] = [
  { key: "Mobile", label: "Junior Mobile App Engineer", short: "Mobile · 6", size: 6 },
  { key: "Web", label: "Junior Web Engineer", short: "Web · 6", size: 6 },
  { key: "Analyst", label: "System Analyst", short: "Analyst · 2", size: 2 },
];

export const DEFAULT_PARTICIPANTS: Participant[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `mobile-${i + 1}`,
    name: `Peserta Mobile ${i + 1}`,
    division: "Mobile" as Division,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `web-${i + 1}`,
    name: `Peserta Web ${i + 1}`,
    division: "Web" as Division,
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `analyst-${i + 1}`,
    name: `Peserta Analyst ${i + 1}`,
    division: "Analyst" as Division,
  })),
];

export const PARTICIPANTS_KEY = "rolling-libur:participants:v1";
export const ASSIGNMENTS_KEY = "rolling-libur:assignments:v1";

export type Assignments = Record<string, Record<string, OffDay>>; // weekKey -> participantId -> offDay

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (copy.getDay() + 6) % 7; // Mon = 0
  copy.setDate(copy.getDate() - dow);
  return copy;
}

export function addWeeks(monday: Date, n: number): Date {
  const copy = new Date(monday);
  copy.setDate(copy.getDate() + n * 7);
  return copy;
}

export function weekLabel(monday: Date): string {
  const fri = new Date(monday);
  fri.setDate(fri.getDate() + 4);
  const sat = new Date(monday);
  sat.setDate(sat.getDate() + 5);
  const fmt = (x: Date) =>
    x.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(monday)} - ${fmt(sat)}`;
}

export function weekShort(monday: Date): string {
  const sat = new Date(monday);
  sat.setDate(sat.getDate() + 5);
  const fmt = (x: Date) => x.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return `${fmt(monday)} - ${fmt(sat)} ${sat.getFullYear()}`;
}

/** Hari libur yang diizinkan minggu ini, berdasarkan minggu lalu. */
export function allowedOffDay(prevOffDay: OffDay | undefined): OffDay[] {
  if (prevOffDay === "fri") return ["sat"];
  if (prevOffDay === "sat") return ["fri"];
  return ["fri", "sat"];
}

export function isLocked(prevOffDay: OffDay | undefined, day: OffDay): boolean {
  return !allowedOffDay(prevOffDay).includes(day);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Roll seimbang per divisi dengan menghormati aturan selang-seling:
 * peserta yang minggu lalu libur Jumat wajib libur Sabtu minggu ini (dan sebaliknya).
 * Target: Mobile 3 Jumat / 3 Sabtu, Web 3/3, Analyst 1/1.
 */
export function rollWeek(
  participants: Participant[],
  prevWeek: Record<string, OffDay> | undefined
): Record<string, OffDay> {
  const result: Record<string, OffDay> = {};
  for (const div of DIVISIONS) {
    const members = participants.filter((p) => p.division === div.key);
    const targetFri = Math.floor(members.length / 2);
    const forcedSat = members.filter((p) => prevWeek?.[p.id] === "fri");
    const forcedFri = members.filter((p) => prevWeek?.[p.id] === "sat");
    const free = shuffle(members.filter((p) => !prevWeek?.[p.id]));
    for (const p of forcedSat) result[p.id] = "sat";
    for (const p of forcedFri) result[p.id] = "fri";
    let friCount = forcedFri.length;
    for (const p of free) {
      if (friCount < targetFri) {
        result[p.id] = "fri";
        friCount++;
      } else {
        result[p.id] = "sat";
      }
    }
  }
  return result;
}
