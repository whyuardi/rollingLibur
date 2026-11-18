"use client";

import { useEffect, useMemo, useState } from "react";
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

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Nama peserta + 6 kolom hari. Di HP kolom hari tetap muat tanpa scroll horizontal.
const GRID_COLS = "minmax(92px, 1.6fr) repeat(6, minmax(34px, 1fr))";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

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
    const rolled = rollWeek(participants, prevMap);
    setAssignments((prevAll) => ({ ...prevAll, [weekKey]: rolled }));
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

  function startEdit(p: Participant) {
    setDraft(p.name);
    setEditingId(p.id);
  }

  function endEdit(id: string) {
    if (draft.trim()) rename(id, draft.trim());
    setEditingId(null);
  }

  const todayIdx = (() => {
    const now = new Date();
    const idx = (now.getDay() + 6) % 7;
    return toKey(mondayOf(now)) === weekKey ? idx : -1;
  })();

  if (!mounted) {
    return (
      <main className="mx-auto max-w-[860px] px-4 py-10">
        <p className="font-mono text-xs tracking-wide text-faint">Memuat jadwal…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[860px] px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
      {/* ===== Masthead dokumen ===== */}
      <header className="no-print border-b-2 border-ink pb-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          PT Ethes Teknologi Makmur — MagangHub
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Rolling Libur
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Masuk 5 hari dalam seminggu. Setiap peserta libur Jumat <strong className="text-ink">atau</strong> Sabtu
          — kalau libur Jumat, Sabtu masuk, begitu sebaliknya. Minggu ini libur Jumat, minggu depan
          hanya bisa libur Sabtu.
        </p>
      </header>

      {/* ===== Navigasi minggu: tautan teks polos ===== */}
      <nav className="no-print mt-4 flex items-baseline justify-between gap-2" aria-label="Navigasi minggu">
        <button
          type="button"
          onClick={() => setMonday((m) => addWeeks(m, -1))}
          className="font-mono text-xs uppercase tracking-wide text-ink underline underline-offset-4"
        >
          ← Sebelumnya
        </button>
        <p className="min-w-0 text-center font-mono text-xs font-semibold sm:text-sm">
          {weekLabel(monday)}
        </p>
        <button
          type="button"
          onClick={() => setMonday((m) => addWeeks(m, 1))}
          className="font-mono text-xs uppercase tracking-wide text-ink underline underline-offset-4"
        >
          Berikutnya →
        </button>
      </nav>
      <div className="no-print mt-1 text-center">
        <button
          type="button"
          onClick={() => setMonday(mondayOf(new Date()))}
          className="font-mono text-[11px] uppercase tracking-wide text-muted underline underline-offset-4"
        >
          Minggu ini
        </button>
      </div>

      {/* ===== Aksi ===== */}
      <div className="no-print mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleRoll}
          className="bg-ink px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide text-white"
        >
          Roll Minggu Ini
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={chosenCount === 0}
          className="border border-ink bg-white px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide text-ink disabled:opacity-40"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={chosenCount === 0}
          className="border border-hairline bg-white px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide text-muted disabled:opacity-40"
        >
          Bersihkan
        </button>
      </div>

      {/* ===== Status minggu ===== */}
      <p className="no-print mt-4 font-mono text-xs leading-relaxed text-muted">
        {chosenCount}/{participants.length} sudah memilih
        {isFinal
          ? " — Jadwal final."
          : unchosen.length > 0
            ? ` — Belum memilih: ${unchosen.map((p) => p.name).join(", ")}.`
            : ""}
      </p>

      {/* ===== Grid jadwal mingguan ===== */}
      <section className="no-print mt-5" aria-label="Jadwal minggu ini">
        {/* Kepala kolom */}
        <div
          className="grid items-end gap-x-1 border-b border-ink pb-1"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wide">Peserta</span>
          {DAYS.map((d, i) => (
            <span
              key={d}
              title={DAY_NAMES[i]}
              className={`text-center font-mono text-[10px] uppercase tracking-wide ${
                todayIdx === i ? "font-bold text-ink underline underline-offset-4" : "text-muted"
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {DIVISIONS.map((div) => {
          const members = participants.filter((p) => p.division === div.key);
          const friCount = members.filter((p) => weekMap[p.id] === "fri").length;
          const satCount = members.filter((p) => weekMap[p.id] === "sat").length;
          return (
            <div key={div.key}>
              {/* Subjudul divisi */}
              <p className="border-b border-hairline-soft pt-3 font-mono text-[11px] font-semibold uppercase tracking-wide">
                {div.label} — {div.size} peserta · Jumat {friCount} / Sabtu {satCount}
              </p>
              {members.map((p) => {
                const offDay = weekMap[p.id];
                const prev = prevMap[p.id];
                return (
                  <div
                    key={p.id}
                    className="grid items-center gap-x-1 border-b border-hairline-soft py-2"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    {/* Nama (boleh membungkus dua baris di HP, tidak terpotong) */}
                    <span className="min-w-0 break-words pr-1 text-[13px] font-medium leading-snug">
                      {editingId === p.id ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => endEdit(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full border border-ink px-1.5 py-0.5 text-[13px] outline-none"
                          aria-label="Nama peserta"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-left"
                          title="Klik untuk mengedit nama"
                        >
                          {p.name} <span aria-hidden="true" className="text-xs text-faint">✎</span>
                        </button>
                      )}
                    </span>

                    {/* Senin–Kamis: selalu masuk */}
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="text-center font-mono text-[10px] text-muted">
                        MASUK
                      </span>
                    ))}

                    {/* Jumat & Sabtu: pilih / terkunci / libur / masuk */}
                    {(["fri", "sat"] as OffDay[]).map((day) => {
                      const locked = !allowedOffDay(prev).includes(day);
                      const selected = offDay === day;
                      const otherSelected = offDay !== undefined && offDay !== day;
                      if (selected) {
                        return (
                          <span
                            key={day}
                            className="bg-ink py-1.5 text-center font-mono text-[10px] font-semibold text-white"
                          >
                            LIBUR
                          </span>
                        );
                      }
                      if (otherSelected) {
                        return (
                          <span key={day} className="py-1.5 text-center font-mono text-[10px] text-muted">
                            MASUK
                          </span>
                        );
                      }
                      if (locked) {
                        return (
                          <span
                            key={day}
                            title="Terkunci oleh aturan selang-seling minggu lalu"
                            className="py-1.5 text-center font-mono text-[10px] text-faint line-through"
                          >
                            —
                          </span>
                        );
                      }
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => selectOffDay(p.id, day)}
                          className="border border-hairline py-1.5 text-center font-mono text-[10px] text-ink"
                        >
                          PILIH
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      {/* ===== Daftar Libur & Masuk: daftar teks ===== */}
      <section className="no-print mt-8 border-t-2 border-ink pt-4" aria-label="Daftar libur dan masuk">
        <h2 className="text-lg font-bold tracking-tight">Daftar Libur &amp; Masuk</h2>
        {!isFinal && unchosen.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            Belum lengkap — {unchosen.length} peserta belum memilih: {unchosen.map((p) => p.name).join(", ")}.
          </p>
        )}
        {isFinal && (
          <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-wide">
            Jadwal final — semua peserta sudah memilih.
          </p>
        )}
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {[
            { title: "Jumat", off: friOff, on: friOn },
            { title: "Sabtu", off: satOff, on: satOn },
          ].map(({ title, off, on }) => (
            <div key={title}>
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wide">
                {title} — Libur {off.length} · Masuk {on.length}
              </h3>
              <p className="mt-2 text-sm leading-relaxed">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">Libur: </span>
                {off.length === 0
                  ? "—"
                  : off.map((p) => `${p.name} (${p.division})`).join(", ")}
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">Masuk: </span>
                {on.length === 0
                  ? "—"
                  : on.map((p) => `${p.name} (${p.division})`).join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Aturan ===== */}
      <details className="no-print mt-8 border-t border-hairline pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Aturan rolling</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Masuk 5 hari: Senin–Kamis selalu masuk, plus Jumat atau Sabtu.</li>
          <li>Libur Jumat berarti Sabtu masuk, dan sebaliknya.</li>
          <li>Kalau minggu ini libur Jumat, minggu depan hanya bisa libur Sabtu (pilihan Jumat terkunci).</li>
          <li>Roll membagi seimbang per divisi: Mobile 3/3, Web 3/3, Analyst 1/1.</li>
          <li>Data tersimpan di perangkat ini (localStorage) per minggu — reload tidak hilang, ganti minggu tidak menghapus minggu sebelumnya. Tombol Bersihkan hanya menghapus minggu yang sedang tampil.</li>
        </ul>
      </details>

      <footer className="no-print mt-8 border-t border-hairline pt-3 font-mono text-[11px] text-faint">
        Rolling Libur MagangHub · PT Ethes Teknologi Makmur · Data tersimpan lokal di perangkat ini.
      </footer>

      {/* ===== Versi cetak / PDF (hanya saat print) ===== */}
      <div className="print-only">
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
