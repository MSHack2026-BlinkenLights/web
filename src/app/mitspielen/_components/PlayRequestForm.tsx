"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { toLocalInputValue } from "wbl/app/mitspielen/_components/time";
import { api, type RouterOutputs } from "wbl/trpc/react";

type Options = RouterOutputs["lookingToPlay"]["options"];

interface PlayRequestFormProps {
  open: boolean;
  onClose: () => void;
  controllers: Options["controllers"];
  gameTypes: Options["gameTypes"];
  defaultControllerId?: string;
}

const DURATIONS = [30, 60, 90, 120, 180];

const fieldClass =
  "bg-pixel-off focus-visible:outline-neon-cyan min-h-12 w-full rounded-xl border border-white/10 px-3 text-base text-white focus-visible:outline-2";

/** Next full quarter hour, a sensible default start. */
function nextQuarterHour() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 15) * 15);
  return date;
}

/** Bottom sheet to offer a round at a location. */
export function PlayRequestForm({
  open,
  onClose,
  controllers,
  gameTypes,
  defaultControllerId,
}: PlayRequestFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const utils = api.useUtils();

  const [controllerId, setControllerId] = useState("");
  const [gameTypeId, setGameTypeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [openSlots, setOpenSlots] = useState(1);
  const [note, setNote] = useState("");

  const create = api.lookingToPlay.create.useMutation({
    onSuccess: async () => {
      await utils.lookingToPlay.list.invalidate();
      onClose();
    },
  });

  // Reset and show as modal whenever it opens.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setControllerId(defaultControllerId ?? "");
      setGameTypeId("");
      setStartsAt(toLocalInputValue(nextQuarterHour()));
      setDurationMinutes(60);
      setOpenSlots(1);
      setNote("");
      create.reset();
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // `create.reset` is stable enough; only react to opening/closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const controller = controllers.find((c) => c.id === controllerId);
  // Only games whose grid fits the chosen location.
  const fittingGames = controller
    ? gameTypes.filter(
        (g) =>
          g.requiredWidth <= controller.width &&
          g.requiredHeight <= controller.height,
      )
    : gameTypes;
  const gameType = fittingGames.find((g) => g.id === gameTypeId);
  const maxSlots = gameType ? gameType.maxPlayers - 1 : 1;

  // Drop a selected game that no longer fits, and clamp seats to the new game.
  useEffect(() => {
    if (gameTypeId && !gameType) setGameTypeId("");
  }, [gameTypeId, gameType]);
  useEffect(() => {
    setOpenSlots((n) => Math.min(Math.max(n, 1), maxSlots));
  }, [maxSlots]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!controllerId || !gameTypeId || !startsAt) return;
    create.mutate({
      controllerId,
      gameTypeId,
      // datetime-local has no zone; the browser reads it as local time.
      startsAt: new Date(startsAt),
      durationMinutes,
      openSlots,
      note: note.trim() || undefined,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="play-request-form-title"
      className="bg-surface mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 p-0 text-white backdrop:bg-black/70 md:mb-auto md:rounded-2xl"
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="play-request-form-title" className="text-xl font-bold">
            Runde anbieten
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="-mr-2 flex size-12 items-center justify-center rounded-full text-white/70 hover:text-white"
          >
            <DynamicIcon name="Xmark" size={24} />
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Standort
          <select
            required
            value={controllerId}
            onChange={(event) => setControllerId(event.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              Standort wählen
            </option>
            {controllers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.width}×{c.height})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Spiel
          <select
            required
            value={gameTypeId}
            onChange={(event) => setGameTypeId(event.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              {fittingGames.length > 0
                ? "Spiel wählen"
                : "Hier passt leider kein Mehrspieler-Spiel"}
            </option>
            {fittingGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} (bis {g.maxPlayers} Spieler:innen)
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-[3fr_2fr] gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm text-white/70">
            Start
            <input
              type="datetime-local"
              required
              value={startsAt}
              min={toLocalInputValue(new Date())}
              step={300}
              onChange={(event) => setStartsAt(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm text-white/70">
            Dauer
            <select
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
              className={fieldClass}
            >
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60 ? `${minutes} Min.` : `${minutes / 60} Std.`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm text-white/70">
            Wie viele können sich dir anschließen?
          </legend>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Einen Platz weniger"
              disabled={openSlots <= 1}
              onClick={() => setOpenSlots((n) => n - 1)}
              className="bg-pixel-off flex size-12 items-center justify-center rounded-xl border border-white/10 disabled:opacity-40"
            >
              <DynamicIcon name="Minus" size={20} />
            </button>
            <output
              aria-live="polite"
              className="min-w-16 text-center text-lg font-bold"
            >
              {openSlots} {openSlots === 1 ? "Platz" : "Plätze"}
            </output>
            <button
              type="button"
              aria-label="Einen Platz mehr"
              disabled={openSlots >= maxSlots}
              onClick={() => setOpenSlots((n) => n + 1)}
              className="bg-pixel-off flex size-12 items-center justify-center rounded-xl border border-white/10 disabled:opacity-40"
            >
              <DynamicIcon name="Plus" size={20} />
            </button>
          </div>
          {gameType && (
            <p className="text-xs text-white/50">
              Mit dir sind es höchstens {gameType.maxPlayers} Spieler:innen.
            </p>
          )}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Notiz (optional)
          <textarea
            value={note}
            maxLength={200}
            rows={2}
            placeholder="z. B. „Anfänger:innen willkommen!“"
            onChange={(event) => setNote(event.target.value)}
            className={`${fieldClass} py-3`}
          />
        </label>

        {create.isError && (
          <p role="alert" className="text-sm text-red-300">
            Das hat nicht geklappt. Prüf bitte Startzeit und Auswahl und versuch
            es noch mal.
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending || !gameType}
          className="bg-neon-cyan min-h-12 rounded-xl px-4 font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {create.isPending ? "Wird veröffentlicht …" : "Runde veröffentlichen"}
        </button>
      </form>
    </dialog>
  );
}
