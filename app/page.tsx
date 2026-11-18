"use client";

import { useEffect, useMemo, useState } from "react";
import ParticipantRow from "../components/ParticipantRow";
import DayList from "../components/DayList";
import {
  addWeeks,
  allowedOffDay,
  ASSIGNMENTS_KEY,
  DEFAULT_PARTICIPANTS,
  DIVISIONS,
  mondayOf,
  PARTICIPANTS_KEY,
  rollWeek,
  toKey,
  weekLabel,
  weekShort,
  type Assignments,
  type OffDay,
  type Participant,
} from "../lib/schedule";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [filter, setFilter] = useState<"Semua" | "Mobile" | "Web" | "Analyst">("Semua");

  const weekKey = toKey(monday);
  const prevKey = toKey(addWeeks(monday, -1));

  // Muat dari localStorage (sekali, setelah mount agar tidak bentrok SSR).
  useEffect(() => {
    try {
      const p = localStorage.getItem(PARTICIPANTS_KEY);
      if (p) {
        const parsed = JSON.parse(p) as Participant[];
        if (Array.isArray(parsed) && parsed.length === 14) setParticipants(parsed);
      }
      const a = localStorage.getItem(ASSIGNMENTS_KEY);
      if (a) {
        const parsed = JSON.parse(a) as Assignments;
        if (parsed && typeof parsed === "object") setAssignments(parsed);
      }
    } catch {
      // localStorage rusak / tidak tersedia: pakai data default.
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
    } catch { /* abaikan */ }
  }, [participants, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch { /* abaikan */ }
  }, [assignments, mounted]);

  const weekMap = assignments[weekKey] ?? {};
  const prevMap = assignments[prevKey] ?? {};

  const chosenCount = useMemo(
    () => participants.filter((p) => weekMap[p.id]).length,
    [participants, weekMap]
  );
  const isFinal = chosenCount === participants.length;
  const percent = Math.round((chosenCount / participants.length) * 100);

  const friOff = participants.filter((p) => weekMap[p.id] === "fri");
  const satOff = participants.filter((p) => weekMap[p.id] === "sat");
  const friOn = participants.filter((p) => weekMap[p.id] === "sat");
  const satOn = participants.filter((p) => weekMap[p.id] === "fri");
  const unchosen = participants.filter((p) => !weekMap[p.id]);

  function selectOffDay(id: string, day: OffDay) {
    const prev = prevMap[id];
    if (!allowedOffDay(prev).includes(day)) return; // terkunci aturan selang-seling
    setAssignments((prevAll) => ({
      ...prevAll,
      [weekKey]: { ...(prevAll[weekKey] ?? {}), [id]: day },
    }));
  }

  function handleRoll() {
    setRolling(true);
    const rolled = rollWeek(participants, prevMap);
    setAssignments((prevAll) => ({ ...prevAll, [weekKey]: rolled }));
    window.setTimeout(() => setRolling(false), 750);
  }

  function handleClear() {
    if (Object.keys(weekMap).length === 0) return;
    if (!window.confirm(`Hapus jadwal minggu ${weekShort(monday)} saja? Minggu lain tidak ikut terhapus.`)) return;
    setAssignments((prevAll) => {
      const next = { ...prevAll };
      delete next[weekKey];
      return next;
    });
  }

  function handleExport() {
    window.print();
  }

  function rename(id: string, name: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  const visibleDivisions = DIVISIONS.filter((d) => filter === "Semua" || d.key === filter);
  const todayIdx = (() => {
    const now = new Date();
    const idx = (now.getDay() + 6) % 7;
    return toKey(mondayOf(now)) === weekKey ? idx : -1;
  })();

  if (!mounted) {
    return (
      <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="skeleton h-10 w-2/3 rounded-full" />
        <div className="mt-6 space-y-3">
          <div className="skeleton h-24 rounded-[32px]" />
          <div className="skeleton h-24 rounded-[32px]" />
          <div className="skeleton h-24 rounded-[32px]" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
      {/* ===== Kop (layar) ===== */}
      <header className="anim-rise no-print">
        <p className="text-xs font-bold uppercase tracking-wide text-steel">
          PT Ethes Teknologi Makmur · MagangHub
        </p>
        <h1 className="mt-2 text-[26px] font-bold leading-tight text-ink-deep sm:text-5xl">
          Rolling Libur MagangHub
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate sm:text-base">
          Masuk 5 hari dalam seminggu. Setiap peserta libur Jumat <strong>atau</strong> Sabtu —
          kalau libur Jumat, Sabtu masuk, begitu sebaliknya. Minggu ini libur Jumat, minggu depan
          hanya bisa libur Sabtu.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["Semua", "Mobile", "Web", "Analyst"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                filter === f
                  ? "bg-ink-deep text-white"
                  : "border border-hairline bg-white text-ink"
              }`}
            >
              {f === "Semua" ? "Semua divisi" : DIVISIONS.find((d) => d.key === f)?.short ?? f}
            </button>
          ))}
        </div>
      </header>

      {/* ===== Navigasi minggu ===== */}
      <section className="anim-rise no-print mt-6 rounded-[32px] border border-hairline-soft bg-white p-4 sm:p-6" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMonday((m) => addWeeks(m, -1))}
            aria-label="Minggu sebelumnya"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-lg font-bold text-ink"
          >
            ←
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-steel">Minggu</p>
            <p className="truncate text-base font-bold text-ink-deep sm:text-xl">{weekLabel(monday)}</p>
          </div>
          <button
            type="button"
            onClick={() => setMonday((m) => addWeeks(m, 1))}
            aria-label="Minggu berikutnya"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-lg font-bold text-ink"
          >
            →
          </button>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setMonday(mondayOf(new Date()))}
            className="rounded-full border-2 border-ink-deep bg-white px-4 py-1.5 text-sm font-bold text-ink-deep"
          >
            Minggu ini
          </button>
        </div>

        {/* Strip Senin–Sabtu */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {DAYS.map((day, i) => {
            const isFri = i === 4;
            const isSat = i === 5;
            const offCount = isFri ? friOff.length : isSat ? satOff.length : 0;
            const onCount = isFri ? friOn.length : isSat ? satOn.length : participants.length;
            const date = new Date(monday);
            date.setDate(date.getDate() + i);
            return (
              <div
                key={day}
                className={`flex min-h-[86px] flex-col justify-between rounded-2xl border p-3 ${
                  todayIdx === i ? "border-cobalt bg-cobalt-soft" : "border-hairline-soft bg-surface-soft"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold text-ink">{day}</span>
                  <span className="text-xs text-steel">{date.getDate()}</span>
                </div>
                {todayIdx === i && (
                  <span className="mt-1 inline-block w-fit whitespace-nowrap rounded-full bg-ink-deep px-2 py-0.5 text-[10px] font-bold text-white">
                    Hari ini
                  </span>
                )}
                <div className="mt-2 space-y-0.5 text-xs leading-tight">
                  <p className="whitespace-nowrap font-bold text-ink">{offCount} libur</p>
                  <p className="whitespace-nowrap text-steel">{onCount} masuk</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-ink">
              {chosenCount} dari {participants.length} sudah memilih
            </span>
            <span className="anim-pop rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-ink" key={percent}>
              {percent}%
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-soft">
            <div className="progress-bar h-full rounded-full bg-cobalt" style={{ width: `${percent}%` }} />
          </div>
          {isFinal ? (
            <p className="mt-2 text-sm font-bold text-success">✓ Jadwal final — semua peserta sudah memilih.</p>
          ) : (
            <p className="mt-2 text-sm text-steel">
              Belum memilih: {unchosen.map((p) => p.name).join(", ")}
            </p>
          )}
        </div>
      </section>

      {/* ===== Bar aksi (desktop) ===== */}
      <div className="anim-rise no-print mt-6 hidden gap-3 sm:flex" style={{ animationDelay: "140ms" }}>
        <button
          type="button"
          onClick={handleRoll}
          className="flex-1 rounded-full bg-cobalt px-6 py-3.5 text-sm font-bold text-white"
        >
          <span className={rolling ? "anim-spin inline-block" : "inline-block"} aria-hidden="true">↻ </span>
          Roll Minggu Ini
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={chosenCount === 0}
          className="rounded-full border-2 border-ink-deep bg-white px-6 py-3.5 text-sm font-bold text-ink-deep disabled:opacity-40"
        >
          ⬇ Export PDF
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={chosenCount === 0}
          className="rounded-full border-2 border-hairline bg-white px-6 py-3.5 text-sm font-bold text-critical disabled:opacity-40"
        >
          Bersihkan
        </button>
      </div>

      {/* ===== Daftar per divisi ===== */}
      {visibleDivisions.map((div, di) => (
        <section
          key={div.key}
          className="anim-rise no-print mt-6 overflow-hidden rounded-[32px] border border-hairline-soft bg-white"
          style={{ animationDelay: `${160 + di * 60}ms` }}
        >
          <header className="flex flex-col gap-2 border-b border-hairline-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-xl font-bold text-ink-deep sm:text-2xl">{div.label}</h2>
              <p className="text-sm text-steel">{div.size} peserta · target {Math.floor(div.size / 2)} libur Jumat / {Math.ceil(div.size / 2)} libur Sabtu</p>
            </div>
            <span className="w-fit rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-ink">
              {participants.filter((p) => p.division === div.key && weekMap[p.id] === "fri").length} Jumat ·{" "}
              {participants.filter((p) => p.division === div.key && weekMap[p.id] === "sat").length} Sabtu
            </span>
          </header>
          <ul>
            {participants
              .filter((p) => p.division === div.key)
              .map((p, i) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  offDay={weekMap[p.id]}
                  prevOffDay={prevMap[p.id]}
                  editing={editingId === p.id}
                  onSelect={(day) => selectOffDay(p.id, day)}
                  onRename={(name) => rename(p.id, name)}
                  onEditStart={() => setEditingId(p.id)}
                  onEditEnd={() => setEditingId(null)}
                  index={i}
                />
              ))}
          </ul>
        </section>
      ))}

      {/* ===== Daftar Libur & Masuk ===== */}
      <section className="anim-rise no-print mt-6" style={{ animationDelay: "220ms" }}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-ink-deep sm:text-2xl">Daftar Libur &amp; Masuk</h2>
          {isFinal && (
            <span className="anim-celebrate rounded-full bg-ink-deep px-3 py-1 text-xs font-bold text-white">
              Jadwal final
            </span>
          )}
        </div>
        {!isFinal && (
          <p className="mb-3 text-sm text-steel">
            Belum lengkap — {unchosen.length} peserta belum memilih: {unchosen.map((p) => p.name).join(", ")}.
          </p>
        )}
        <div className={`grid gap-4 md:grid-cols-2 ${isFinal ? "anim-celebrate rounded-[32px] bg-ink-deep p-2 sm:p-3" : ""}`}>
          <DayList title="Jumat" off={friOff} on={friOn} accent="fri" />
          <DayList title="Sabtu" off={satOff} on={satOn} accent="sat" />
        </div>
      </section>

      {/* ===== Aturan ===== */}
      <details className="anim-rise no-print mt-6 rounded-[32px] border border-hairline-soft bg-white p-5 sm:p-6">
        <summary className="cursor-pointer text-base font-bold text-ink-deep">
          Aturan rolling — klik untuk melihat
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate">
          <li>Masuk 5 hari: Senin–Kamis selalu masuk, plus Jumat atau Sabtu.</li>
          <li>Libur Jumat berarti Sabtu masuk, dan sebaliknya.</li>
          <li>Kalau minggu ini libur Jumat, minggu depan hanya bisa libur Sabtu (pilihan Jumat terkunci).</li>
          <li>Roll membagi seimbang per divisi: Mobile 3/3, Web 3/3, Analyst 1/1.</li>
          <li>Data tersimpan di perangkat ini (localStorage) per minggu — reload tidak hilang, ganti minggu tidak menghapus minggu sebelumnya. Tombol Bersihkan hanya menghapus minggu yang sedang tampil.</li>
        </ul>
      </details>

      <footer className="no-print mt-8 pb-2 text-center text-xs text-stone">
        Rolling Libur MagangHub · PT Ethes Teknologi Makmur · Data tersimpan lokal di perangkat ini.
      </footer>

      {/* ===== Bar aksi bawah (mobile, satu baris) ===== */}
      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-hairline-soft bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-2px_12px_rgba(20,22,26,0.08)] backdrop-blur sm:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRoll}
            className="h-12 flex-1 whitespace-nowrap rounded-full bg-cobalt px-4 text-sm font-bold text-white"
          >
            <span className={rolling ? "anim-spin inline-block" : "inline-block"} aria-hidden="true">↻ </span>
            Roll Minggu Ini
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={chosenCount === 0}
            aria-label="Export PDF"
            title="Export PDF"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink-deep bg-white text-base font-bold text-ink-deep disabled:opacity-40"
          >
            ⬇
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={chosenCount === 0}
            aria-label="Bersihkan minggu ini"
            title="Bersihkan minggu ini"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-hairline bg-white text-base font-bold text-critical disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ===== Versi cetak / PDF (hanya saat print) ===== */}
      <div className="print-only print-page">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Rolling Libur MagangHub</h1>
        <p>PT Ethes Teknologi Makmur · MagangHub</p>
        <p>
          Minggu {weekLabel(monday)} · {isFinal ? "Jadwal final" : "Sementara"} ·{" "}
          {chosenCount}/{participants.length} sudah memilih
        </p>
        <hr />
        <h2>Jumat — Libur ({friOff.length}) / Masuk ({friOn.length})</h2>
        <p><strong>Libur:</strong> {friOff.map((p) => `${p.name} (${p.division})`).join(", ") || "-"}</p>
        <p><strong>Masuk:</strong> {friOn.map((p) => `${p.name} (${p.division})`).join(", ") || "-"}</p>
        <h2>Sabtu — Libur ({satOff.length}) / Masuk ({satOn.length})</h2>
        <p><strong>Libur:</strong> {satOff.map((p) => `${p.name} (${p.division})`).join(", ") || "-"}</p>
        <p><strong>Masuk:</strong> {satOn.map((p) => `${p.name} (${p.division})`).join(", ") || "-"}</p>
        <h2>Rincian per Peserta</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #999" }}>Nama</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #999" }}>Divisi</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #999" }}>Hari Libur</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.division}</td>
                <td>{weekMap[p.id] === "fri" ? "Jumat" : weekMap[p.id] === "sat" ? "Sabtu" : "Belum memilih"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#666" }}>
          Aturan: masuk 5 hari; libur Jumat berarti Sabtu masuk dan sebaliknya; minggu ini libur
          Jumat, minggu depan hanya bisa libur Sabtu.
        </p>
      </div>
    </main>
  );
}
