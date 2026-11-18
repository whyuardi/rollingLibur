"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addWeeks,
  allowedOffDay,
  DEFAULT_PARTICIPANTS,
  DIVISIONS,
  mondayOf,
  rollWeek,
  toKey,
  weekLabel,
  weekShort,
  type Assignments,
  type OffDay,
  type Participant,
} from "../lib/schedule";
import {
  clearOffDay,
  clearWeek,
  loadBoard,
  renameParticipant,
  saveWeek,
  setOffDay,
} from "../lib/supabase";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_LABEL: Record<OffDay, string> = { fri: "Jumat", sat: "Sabtu" };

// Grid desktop: nama peserta + 6 kolom hari.
const GRID_COLS = "minmax(120px, 1.6fr) repeat(6, minmax(44px, 1fr))";

/** Status satu sel hari libur, dipakai grid desktop dan kartu HP. */
type DayState = "selected" | "pick" | "move" | "locked";
function dayState(
  prev: OffDay | undefined,
  offDay: OffDay | undefined,
  day: OffDay
): DayState {
  if (offDay === day) return "selected";
  if (!allowedOffDay(prev).includes(day)) return "locked";
  return offDay === undefined ? "pick" : "move";
}

/** Nama peserta yang bisa diklik untuk mengedit. */
function EditableName(props: {
  p: Participant;
  editingId: string | null;
  draft: string;
  onDraft: (v: string) => void;
  onStart: (p: Participant) => void;
  onEnd: (id: string) => void;
  onCancel: () => void;
  nameClassName?: string;
  inputClassName?: string;
}) {
  const { p, editingId, draft, onDraft, onStart, onEnd, onCancel } = props;
  if (editingId === p.id) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={() => onEnd(p.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") onCancel();
        }}
        className={
          props.inputClassName ??
          "w-full border border-ink px-1.5 py-0.5 text-[13px] outline-none"
        }
        aria-label="Nama peserta"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => onStart(p)}
      className={`min-h-[44px] text-left ${props.nameClassName ?? ""}`}
      title="Ketuk untuk mengedit nama"
    >
      {p.name} <span aria-hidden="true" className="text-xs text-faint">✎</span>
    </button>
  );
}

/** Daftar nama satu kelompok (Libur / Masuk) — satu nama per baris. */
function PersonList(props: { label: string; people: Participant[] }) {
  const { label, people } = props;
  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wide">
        {label} ({people.length})
      </p>
      {people.length === 0 ? (
        <p className="mt-1 py-1 text-sm text-faint">—</p>
      ) : (
        <ul className="mt-1 divide-y divide-hairline-soft">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex min-h-[28px] items-baseline justify-between gap-3 py-1 text-sm"
            >
              <span>{p.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-faint">
                {p.division}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const weekKey = toKey(monday);
  const prevKey = toKey(addWeeks(monday, -1));

  // Muat dari Supabase kalau env diisi, kalau tidak fallback ke
  // localStorage (sekali, setelah mount agar tidak bentrok SSR).
  useEffect(() => {
    let cancelled = false;
    loadBoard()
      .then((board) => {
        if (cancelled) return;
        setParticipants(board.participants);
        setAssignments(board.assignments);
        setMounted(true);
      })
      .catch(() => {
        if (!cancelled) setMounted(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function selectOffDay(id: string, day: OffDay) {
    const prev = prevMap[id];
    if (!allowedOffDay(prev).includes(day)) return; // terkunci aturan selang-seling
    const next = {
      ...assignments,
      [weekKey]: { ...(assignments[weekKey] ?? {}), [id]: day },
    };
    setAssignments(next);
    try {
      await setOffDay(weekKey, id, day, assignments);
    } catch {
      // Gagal simpan ke Supabase: tampilan minggu ini tetap, tapi
      // perubahan bisa hilang saat reload — muat ulang dari server.
      loadBoard().then((board) => {
        setParticipants(board.participants);
        setAssignments(board.assignments);
      });
    }
  }

  async function handleClearOffDay(id: string) {
    const next = { ...assignments };
    if (next[weekKey]) {
      const week = { ...next[weekKey] };
      delete week[id];
      if (Object.keys(week).length === 0) delete next[weekKey];
      else next[weekKey] = week;
    }
    setAssignments(next);
    try {
      await clearOffDay(weekKey, id, assignments);
    } catch {
      // Gagal hapus di Supabase: muat ulang dari server.
      loadBoard().then((board) => {
        setParticipants(board.participants);
        setAssignments(board.assignments);
      });
    }
  }

  async function handleRoll() {
    const rolled = rollWeek(participants, prevMap);
    setAssignments((prevAll) => ({ ...prevAll, [weekKey]: rolled }));
    try {
      await saveWeek(weekKey, rolled, assignments);
    } catch {
      loadBoard().then((board) => {
        setAssignments(board.assignments);
      });
    }
  }

  async function handleClear() {
    if (Object.keys(weekMap).length === 0) return;
    if (!window.confirm(`Hapus jadwal minggu ${weekShort(monday)} saja? Minggu lain tidak ikut terhapus.`)) return;
    setAssignments((prevAll) => {
      const next = { ...prevAll };
      delete next[weekKey];
      return next;
    });
    try {
      await clearWeek(weekKey, assignments);
    } catch {
      loadBoard().then((board) => {
        setAssignments(board.assignments);
      });
    }
  }

  function handleExport() {
    window.print();
  }

  async function rename(id: string, name: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    try {
      await renameParticipant(id, name, participants);
    } catch {
      loadBoard().then((board) => {
        setParticipants(board.participants);
      });
    }
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

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Periode singkat untuk strip kop dokumen, mis. "16–21 Nov 2026".
  const periodShort = (() => {
    const sat = new Date(monday);
    sat.setDate(sat.getDate() + 5);
    const mo = sat.toLocaleDateString("id-ID", { month: "short" });
    return `${monday.getDate()}–${sat.getDate()} ${mo} ${sat.getFullYear()}`;
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
      {/* ===== Kop dokumen ===== */}
      <header className="no-print">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          PT Ethes Teknologi Makmur — MagangHub
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Rolling Libur
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Masuk 5 hari dalam seminggu. Setiap peserta libur Jumat{" "}
          <strong className="text-ink">atau</strong> Sabtu — kalau libur Jumat, Sabtu
          masuk, begitu sebaliknya. Minggu ini libur Jumat, minggu depan hanya bisa
          libur Sabtu.
        </p>
        {/* Strip data dokumen: periode / status / peserta */}
        <dl className="mt-5 grid grid-cols-3 divide-x divide-hairline border-y-2 border-ink py-2.5">
          <div className="min-w-0 px-2 first:pl-0 sm:px-4">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-faint">
              Periode
            </dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-snug">
              {periodShort}
            </dd>
          </div>
          <div className="min-w-0 px-2 sm:px-4">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-faint">
              Status
            </dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-snug">
              {isFinal ? "Jadwal final" : `${chosenCount}/14 memilih`}
            </dd>
          </div>
          <div className="min-w-0 px-2 sm:px-4">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-faint">
              Peserta
            </dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-snug">
              14 orang
            </dd>
          </div>
        </dl>
      </header>

      {/* ===== Navigasi minggu ===== */}
      <nav
        className="no-print mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
        aria-label="Navigasi minggu"
      >
        <button
          type="button"
          onClick={() => setMonday((m) => addWeeks(m, -1))}
          className="flex min-h-[44px] items-center justify-start whitespace-nowrap px-1 text-left font-mono text-[11px] uppercase tracking-wide text-ink underline underline-offset-4 sm:text-xs"
        >
          ‹ Sebelumnya
        </button>
        <p className="text-center font-mono text-xs font-semibold sm:text-sm">
          {weekShort(monday)}
        </p>
        <button
          type="button"
          onClick={() => setMonday((m) => addWeeks(m, 1))}
          className="flex min-h-[44px] items-center justify-end whitespace-nowrap px-1 text-right font-mono text-[11px] uppercase tracking-wide text-ink underline underline-offset-4 sm:text-xs"
        >
          Berikutnya ›
        </button>
      </nav>
      <div className="no-print mt-1 text-center">
        <button
          type="button"
          onClick={() => setMonday(mondayOf(new Date()))}
          className="inline-flex min-h-[44px] items-center px-2 font-mono text-[11px] uppercase tracking-wide text-muted underline underline-offset-4"
        >
          Minggu ini
        </button>
      </div>

      {/* ===== Aksi ===== */}
      <div className="no-print mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={handleRoll}
          className="flex min-h-[48px] w-full items-center justify-center bg-ink px-4 font-mono text-xs font-semibold uppercase tracking-wide text-white sm:w-auto"
        >
          Roll Minggu Ini
        </button>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <button
            type="button"
            onClick={handleExport}
            disabled={chosenCount === 0}
            className="flex min-h-[48px] items-center justify-center border border-ink bg-white px-4 font-mono text-xs font-semibold uppercase tracking-wide text-ink disabled:opacity-40"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={chosenCount === 0}
            className="flex min-h-[48px] items-center justify-center border border-hairline bg-white px-4 font-mono text-xs font-semibold uppercase tracking-wide text-muted disabled:opacity-40"
          >
            Bersihkan
          </button>
        </div>
      </div>

      {/* ===== Status minggu ===== */}
      <p className="no-print mt-4 font-mono text-xs leading-relaxed text-muted">
        {chosenCount}/{participants.length} sudah memilih
        {isFinal
          ? " — Jadwal final."
          : unchosen.length > 0
            ? ` — ${unchosen.length} belum memilih.`
            : ""}
      </p>
      <p className="no-print mt-1 font-mono text-[11px] leading-relaxed text-faint">
        Pilihan masih bisa diganti — ketuk PILIH di hari lain untuk pindah, ketuk LIBUR
        untuk membatalkan.
      </p>

      {/* ===== 01 · Jadwal minggu ini — grid desktop (≥640px) ===== */}
      <section className="no-print mt-8 hidden border-t-2 border-ink pt-4 sm:block" aria-label="Jadwal minggu ini">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em]">
          01 — Jadwal minggu ini
        </h2>
        {/* Kepala kolom */}
        <div
          className="mt-4 grid items-end gap-x-1 border-b border-ink pb-1"
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
                    <span className="min-w-0 pr-1 text-[13px] font-medium leading-snug">
                      <EditableName
                        p={p}
                        editingId={editingId}
                        draft={draft}
                        onDraft={setDraft}
                        onStart={startEdit}
                        onEnd={endEdit}
                        onCancel={() => setEditingId(null)}
                      />
                    </span>

                    {/* Senin–Kamis: selalu masuk */}
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="text-center font-mono text-[10px] text-muted">
                        MASUK
                      </span>
                    ))}

                    {/* Jumat & Sabtu */}
                    {(["fri", "sat"] as OffDay[]).map((day) => {
                      const state = dayState(prev, offDay, day);
                      if (state === "selected") {
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleClearOffDay(p.id)}
                            title="Ketuk untuk membatalkan pilihan"
                            className="flex min-h-[44px] items-center justify-center bg-ink px-1 text-center font-mono text-[10px] font-semibold text-white"
                          >
                            LIBUR ✕
                          </button>
                        );
                      }
                      if (state === "locked") {
                        return (
                          <span
                            key={day}
                            title="Terkunci oleh aturan selang-seling minggu lalu"
                            className="flex min-h-[44px] items-center justify-center text-center font-mono text-[10px] text-faint line-through"
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
                          title={state === "move" ? "Ketuk untuk memilih hari ini" : undefined}
                          className="flex min-h-[44px] items-center justify-center border border-hairline px-1 text-center font-mono text-[10px] text-ink"
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

      {/* ===== 01 · Jadwal minggu ini — kartu HP (<640px) ===== */}
      <section className="no-print mt-8 border-t-2 border-ink pt-4 sm:hidden" aria-label="Jadwal minggu ini">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em]">
          01 — Jadwal minggu ini
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Senin–Kamis semua masuk. Pilih hari libur Jumat atau Sabtu di bawah ini.
        </p>
        {DIVISIONS.map((div) => {
          const members = participants.filter((p) => p.division === div.key);
          const friCount = members.filter((p) => weekMap[p.id] === "fri").length;
          const satCount = members.filter((p) => weekMap[p.id] === "sat").length;
          return (
            <div key={div.key} className="mt-5">
              <p className="border-b border-ink pb-1 text-[13px] font-semibold leading-snug">
                {div.label}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {div.size} peserta · Jumat {friCount} · Sabtu {satCount}
              </p>
              {members.map((p) => {
                const offDay = weekMap[p.id];
                const prev = prevMap[p.id];
                return (
                  <div key={p.id} className="border-b border-hairline-soft py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-[15px] font-medium leading-snug">
                        <EditableName
                          p={p}
                          editingId={editingId}
                          draft={draft}
                          onDraft={setDraft}
                          onStart={startEdit}
                          onEnd={endEdit}
                          onCancel={() => setEditingId(null)}
                          inputClassName="w-full border border-ink px-2 py-1 text-[15px] outline-none"
                        />
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted">
                        {offDay
                          ? `Libur ${DAY_LABEL[offDay]}`
                          : "Belum memilih"}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-faint">
                      Senin–Kamis: masuk
                      {prev ? ` · Minggu lalu libur ${DAY_LABEL[prev]}` : ""}
                    </p>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      {(["fri", "sat"] as OffDay[]).map((day) => {
                        const state = dayState(prev, offDay, day);
                        const label = DAY_LABEL[day];
                        if (state === "selected") {
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleClearOffDay(p.id)}
                              className="flex min-h-[48px] items-center justify-center bg-ink px-2 text-center font-mono text-xs font-semibold text-white"
                            >
                              {label} — Libur ✕
                            </button>
                          );
                        }
                        if (state === "locked") {
                          return (
                            <span
                              key={day}
                              title="Terkunci oleh aturan selang-seling minggu lalu"
                              className="flex min-h-[48px] items-center justify-center border border-hairline px-2 text-center font-mono text-xs text-faint"
                            >
                              {label} — Terkunci
                            </span>
                          );
                        }
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => selectOffDay(p.id, day)}
                            className="flex min-h-[48px] items-center justify-center border border-ink bg-white px-2 text-center font-mono text-xs font-semibold text-ink"
                          >
                            {label} — Pilih libur
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      {/* ===== 02 · Daftar Libur & Masuk ===== */}
      <section className="no-print mt-8 border-t-2 border-ink pt-4" aria-label="Daftar libur dan masuk">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em]">
          02 — Daftar libur &amp; masuk
        </h2>
        {!isFinal && unchosen.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            Belum lengkap — {unchosen.length} peserta belum memilih.
          </p>
        )}
        {isFinal && (
          <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-wide">
            Jadwal final — semua peserta sudah memilih.
          </p>
        )}
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {[
            { title: "Jumat", off: friOff, on: friOn },
            { title: "Sabtu", off: satOff, on: satOn },
          ].map(({ title, off, on }) => (
            <div key={title}>
              <h3 className="border-b border-ink pb-1 text-[13px] font-semibold">
                {title} — Libur {off.length} · Masuk {on.length}
              </h3>
              <div className="mt-3 grid gap-4">
                <PersonList label="Libur" people={off} />
                <PersonList label="Masuk" people={on} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 03 · Aturan ===== */}
      <details className="no-print mt-8 border-t border-hairline pt-4">
        <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold">
          03 — Aturan rolling
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Masuk 5 hari: Senin–Kamis selalu masuk, plus Jumat atau Sabtu.</li>
          <li>Libur Jumat berarti Sabtu masuk, dan sebaliknya.</li>
          <li>Pilihan minggu ini masih bisa diganti atau dibatalkan — ketuk PILIH di hari lain untuk pindah, ketuk LIBUR untuk membatalkan.</li>
          <li>Kalau minggu ini libur Jumat, minggu depan hanya bisa libur Sabtu (pilihan Jumat terkunci).</li>
          <li>Roll membagi seimbang per divisi: Mobile 3/3, Web 3/3, Analyst 1/1.</li>
          <li>
            Reload tidak hilang, ganti minggu tidak menghapus minggu sebelumnya. Tombol Bersihkan hanya menghapus minggu yang sedang tampil.
          </li>
        </ul>
      </details>

      {/* ===== Versi cetak / PDF (hanya saat print) ===== */}
      <div className="print-only print-doc">
        <p className="print-eyebrow">PT Ethes Teknologi Makmur — MagangHub</p>
        <h1>Rolling Libur MagangHub</h1>
        <p className="print-meta">
          Minggu {weekLabel(monday)} · {isFinal ? "Jadwal final" : "Sementara"} ·{" "}
          {chosenCount}/{participants.length} sudah memilih
        </p>

        <h2>1. Rekap libur &amp; masuk</h2>
        <div className="print-recap">
          {[
            { title: "Jumat", off: friOff, on: friOn },
            { title: "Sabtu", off: satOff, on: satOn },
          ].map(({ title, off, on }) => (
            <div key={title}>
              <h3>
                {title} — Libur {off.length} · Masuk {on.length}
              </h3>
              <p className="print-recap-label">Libur</p>
              <ul>
                {off.length === 0 ? (
                  <li>—</li>
                ) : (
                  off.map((p) => (
                    <li key={p.id}>
                      {p.name} ({p.division})
                    </li>
                  ))
                )}
              </ul>
              <p className="print-recap-label">Masuk</p>
              <ul>
                {on.length === 0 ? (
                  <li>—</li>
                ) : (
                  on.map((p) => (
                    <li key={p.id}>
                      {p.name} ({p.division})
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>

        <h2>2. Rincian per peserta</h2>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama</th>
              <th>Divisi</th>
              <th>Senin–Kamis</th>
              <th>Jumat</th>
              <th>Sabtu</th>
              <th>Hari libur</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.division}</td>
                <td>Masuk</td>
                <td>{weekMap[p.id] === "fri" ? "Libur" : "Masuk"}</td>
                <td>{weekMap[p.id] === "sat" ? "Libur" : "Masuk"}</td>
                <td>
                  {weekMap[p.id] === "fri"
                    ? "Jumat"
                    : weekMap[p.id] === "sat"
                      ? "Sabtu"
                      : "Belum memilih"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>3. Aturan</h2>
        <ol className="print-rules">
          <li>Masuk 5 hari: Senin–Kamis selalu masuk, plus Jumat atau Sabtu.</li>
          <li>Libur Jumat berarti Sabtu masuk, dan sebaliknya.</li>
          <li>Kalau minggu ini libur Jumat, minggu depan hanya bisa libur Sabtu.</li>
          <li>Roll membagi seimbang per divisi: Mobile 3/3, Web 3/3, Analyst 1/1.</li>
          <li>Reload tidak hilang; ganti minggu tidak menghapus minggu sebelumnya.</li>
        </ol>
        <p className="print-foot">
          Dicetak pada {todayStr} · Dokumen jadwal mingguan MagangHub.
        </p>
      </div>
    </main>
  );
}
