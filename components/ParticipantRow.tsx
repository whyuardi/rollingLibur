import { useState } from "react";
import { allowedOffDay, initials, type OffDay, type Participant } from "../lib/schedule";

interface Props {
  participant: Participant;
  offDay: OffDay | undefined;
  prevOffDay: OffDay | undefined;
  editing: boolean;
  onSelect: (day: OffDay) => void;
  onRename: (name: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  index: number;
}

export default function ParticipantRow({
  participant,
  offDay,
  prevOffDay,
  editing,
  onSelect,
  onRename,
  onEditStart,
  onEditEnd,
  index,
}: Props) {
  const [draft, setDraft] = useState(participant.name);
  const allowed = allowedOffDay(prevOffDay);

  return (
    <li
      className="anim-row flex flex-col gap-3 border-b border-hairline-soft px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-sm font-bold text-ink">
          {initials(participant.name)}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft.trim()) onRename(draft.trim());
                onEditEnd();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") onEditEnd();
              }}
              className="w-full rounded-lg border border-cobalt px-2 py-1 text-sm font-bold outline-none"
              aria-label="Nama peserta"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(participant.name);
                onEditStart();
              }}
              className="flex max-w-full items-center gap-1 truncate text-left text-sm font-bold text-ink"
              title="Klik untuk mengedit nama"
            >
              <span className="truncate">{participant.name}</span>
              <span aria-hidden="true" className="shrink-0 text-xs text-steel">✎</span>
            </button>
          )}
          <p className="text-xs text-steel">
            {prevOffDay === "fri"
              ? "Minggu lalu libur Jumat → minggu ini hanya bisa Sabtu"
              : prevOffDay === "sat"
                ? "Minggu lalu libur Sabtu → minggu ini hanya bisa Jumat"
                : "Masuk 5 hari · libur Jumat atau Sabtu"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-2" role="group" aria-label={`Hari libur ${participant.name}`}>
        {(["fri", "sat"] as OffDay[]).map((day) => {
          const locked = !allowed.includes(day);
          const selected = offDay === day;
          return (
            <button
              key={day}
              type="button"
              disabled={locked}
              onClick={() => onSelect(day)}
              aria-pressed={selected}
              title={locked ? "Terkunci oleh aturan selang-seling minggu lalu" : undefined}
              className={`toggle-pill rounded-full px-4 py-2 text-sm font-bold ${
                selected
                  ? "bg-cobalt text-white shadow-[0_0_0_3px_rgba(0,100,224,0.15)]"
                  : locked
                    ? "cursor-not-allowed border border-hairline bg-surface-soft text-stone line-through"
                    : "border-2 border-hairline bg-white text-ink hover:border-cobalt"
              }`}
            >
              {selected ? "✓ " : ""}
              {day === "fri" ? "Jumat" : "Sabtu"}
            </button>
          );
        })}
      </div>
    </li>
  );
}
