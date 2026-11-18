import { initials, type Participant } from "../lib/schedule";

interface Props {
  title: string;
  off: Participant[];
  on: Participant[];
  accent: "fri" | "sat";
}

/** Satu kartu Daftar Libur & Masuk untuk satu hari (Jumat / Sabtu). */
export default function DayList({ title, off, on, accent }: Props) {
  return (
    <article className="print-card rounded-[32px] border border-hairline-soft bg-white p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-ink-deep">{title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            accent === "fri" ? "bg-warning-soft text-ink" : "bg-success-soft text-success"
          }`}
        >
          {off.length} libur · {on.length} masuk
        </span>
      </header>

      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-steel">Libur</h4>
      {off.length === 0 ? (
        <p className="mb-4 text-sm text-stone">Tidak ada yang libur.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {off.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning-soft text-[11px] font-bold text-ink">
                {initials(p.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{p.name}</span>
                <span className="block text-xs text-steel">{p.division}</span>
              </span>
              <span className="ml-auto shrink-0 rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold text-ink-deep">
                Libur
              </span>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-steel">Masuk</h4>
      {on.length === 0 ? (
        <p className="text-sm text-stone">Tidak ada yang masuk.</p>
      ) : (
        <ul className="space-y-2">
          {on.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-[11px] font-bold text-success">
                {initials(p.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{p.name}</span>
                <span className="block text-xs text-steel">{p.division}</span>
              </span>
              <span className="ml-auto shrink-0 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">
                Masuk
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
