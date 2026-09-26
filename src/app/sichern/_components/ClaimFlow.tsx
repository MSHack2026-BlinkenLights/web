"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { addLocalClaim } from "wbl/app/_components/claim/local-claims";
import { cellsToPixels } from "wbl/app/_components/claim/pixels";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { Button, buttonClasses } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { SelectField } from "wbl/app/_components/ui/select-field";
import { Skeleton, SkeletonGroup } from "wbl/app/_components/ui/skeleton";
import { ErrorState } from "wbl/app/_components/ui/states";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { CLAIM_COLORS, CLAIM_PATTERN_TTL_MS } from "wbl/utils/claim";
import { formatDay, formatTime } from "wbl/utils/time";
import { type PatternCell, PatternInput } from "./PatternInput";

type Target = RouterOutputs["claim"]["target"];
type ClaimableGame = NonNullable<Target["game"]>;
type Challenge = RouterOutputs["claim"]["show"];

interface Claimed {
  gameId: string;
  savedToHistory: boolean;
  game: ClaimableGame;
  controller: Target["controller"];
}

const BLOCKER_TEXT: Record<
  NonNullable<Target["blocker"]>,
  { icon: string; text: string }
> = {
  playing: {
    icon: "Running",
    text: "Hier läuft schon die nächste Runde. Gesichert werden kann nur, bis sie startet.",
  },
  noGame: {
    icon: "ViewGrid",
    text: "An diesem Spielfeld wurde noch nicht gespielt. Leg los!",
  },
  offline: {
    icon: "WifiOff",
    text: "Keine Verbindung zum Spielfeld. Versuch es gleich noch einmal.",
  },
};

/** Ticks every second while `active`, for countdowns. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function endedAgo(endedAt: Date, now: Date) {
  const minutes = Math.floor((now.getTime() - endedAt.getTime()) / 60_000);
  if (minutes < 1) return "gerade eben beendet";
  if (minutes < 60) return `vor ${minutes} Min. beendet`;
  return `beendet ${formatDay(endedAt)}, ${formatTime(endedAt)} Uhr`;
}

interface ClaimFlowProps {
  /** Pad from the QR code at the pad, preselected. */
  initialPadId?: string;
  signedIn: boolean;
}

/**
 * Claiming a round in three steps: confirm the round, copy the pattern the
 * pad shows, done. Signed-in players get it in their history; everyone gets
 * a link to view and download it.
 */
export function ClaimFlow({ initialPadId, signedIn }: ClaimFlowProps) {
  const [pads] = api.claim.pads.useSuspenseQuery();
  const [padId, setPadId] = useState(
    pads.some((pad) => pad.id === initialPadId) ? initialPadId : pads[0]?.id,
  );
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [claimed, setClaimed] = useState<Claimed | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const target = api.claim.target.useQuery(
    { controllerId: padId ?? "" },
    // Keeps "next round started" current while the player decides.
    { enabled: !!padId && !challenge && !claimed, refetchInterval: 10_000 },
  );

  const show = api.claim.show.useMutation({
    onSuccess: (result) => {
      setNotice(null);
      setChallenge(result);
    },
    onError: () => {
      setNotice("Das Muster konnte gerade nicht angezeigt werden.");
      void target.refetch();
    },
  });

  if (!padId) {
    return (
      <p className="text-white/70">Es sind noch keine Spielfelder angelegt.</p>
    );
  }

  if (claimed) return <ClaimSuccess claimed={claimed} />;

  if (challenge && target.data?.game) {
    const { game, controller } = target.data;
    return (
      <PatternStep
        padId={padId}
        challenge={challenge}
        onRetry={() => show.mutate({ controllerId: padId })}
        isRetrying={show.isPending}
        onEnd={(message) => {
          setChallenge(null);
          setNotice(message);
          void target.refetch();
        }}
        onSuccess={(result) => {
          addLocalClaim({
            gameId: result.gameId,
            gameName: game.gameType.name,
            padName: controller.name,
            endedAt: game.endedAt.toISOString(),
          });
          setClaimed({ ...result, game, controller });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepHeader step={1} title="War das dein Spiel?" />

      <SelectField
        label="Spielfeld"
        value={padId}
        onChange={(event) => {
          setPadId(event.target.value);
          setNotice(null);
        }}
      >
        {pads.map((pad) => (
          <option key={pad.id} value={pad.id}>
            {pad.name} · {pad.location}
          </option>
        ))}
      </SelectField>

      <TargetCard
        target={target.data}
        isError={target.isError}
        onRetry={() => void target.refetch()}
      />

      <FormStatus error={notice} />

      {target.data?.game && (
        <div className="flex flex-col gap-3">
          {!signedIn && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
              Auch ohne Konto bekommst du einen Link zum Ansehen und
              Herunterladen.{" "}
              <Link
                href={`/anmelden?weiter=${encodeURIComponent(`/sichern?pad=${padId}`)}`}
                className="text-neon-cyan underline underline-offset-2"
              >
                Melde dich an
              </Link>
              , damit das Spiel in deiner Historie landet.
            </p>
          )}
          <Button
            icon="ViewGrid"
            isPending={show.isPending}
            onClick={() => show.mutate({ controllerId: padId })}
          >
            Muster aufs Spielfeld holen
          </Button>
        </div>
      )}
    </div>
  );
}

/** Placeholder for the first step while the pads load. */
export function ClaimFlowSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <StepHeader step={1} title="War das dein Spiel?" />
      <div aria-hidden className="flex flex-col gap-1">
        <span className="text-xs text-white/60">Spielfeld</span>
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <TargetCardSkeleton />
    </div>
  );
}

function TargetCardSkeleton() {
  return (
    <SkeletonGroup
      label="Letzte Runde wird geladen"
      className="flex items-center gap-4 rounded-2xl border border-white/10 p-4"
    >
      <Skeleton className="size-24 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-32 max-w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-36 max-w-full" />
      </div>
    </SkeletonGroup>
  );
}

function StepHeader({ step, title }: { step: 1 | 2 | 3; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <ol aria-label="Fortschritt" className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            aria-current={n === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-neon-cyan shadow-neon-cyan/60 shadow-[0_0_0.5rem]" : "bg-white/10"}`}
          >
            <span className="sr-only">Schritt {n}</span>
          </li>
        ))}
      </ol>
      <h2 className="font-pixel text-lg">
        <span className="text-white/50">{step}/3 </span>
        {title}
      </h2>
    </div>
  );
}

interface TargetCardProps {
  target: Target | undefined;
  isError: boolean;
  onRetry: () => void;
}

function TargetCard({ target, isError, onRetry }: TargetCardProps) {
  const now = useNow(!!target?.game);

  if (isError) {
    return (
      <ErrorState message="Keine Verbindung zum Spielfeld." onRetry={onRetry} />
    );
  }
  if (!target) return <TargetCardSkeleton />;

  const { game, blocker, controller } = target;
  if (!game) {
    const { icon, text } = BLOCKER_TEXT[blocker ?? "noGame"];
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-white/15 p-4 text-white/80">
        <DynamicIcon name={icon} size={24} className="shrink-0 text-white/50" />
        <p>{text}</p>
      </div>
    );
  }

  return (
    <article className="bg-pixel-off/60 flex items-center gap-4 rounded-2xl border border-white/10 p-4">
      <div className="w-24 shrink-0">
        <PixelGrid
          width={controller.width}
          height={controller.height}
          pixels={cellsToPixels(controller, game.data)}
          label={`Endstand von ${game.gameType.name}`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold">{game.gameType.name}</p>
        <p className="text-sm text-white/60">{controller.name}</p>
        <p className="text-sm text-white/60">{endedAgo(game.endedAt, now)}</p>
      </div>
    </article>
  );
}

interface PatternStepProps {
  padId: string;
  challenge: Challenge;
  onRetry: () => void;
  isRetrying: boolean;
  /** The pattern is gone; back to step 1 with this message. */
  onEnd: (message: string) => void;
  onSuccess: (result: { gameId: string; savedToHistory: boolean }) => void;
}

function PatternStep({
  padId,
  challenge,
  onRetry,
  isRetrying,
  onEnd,
  onSuccess,
}: PatternStepProps) {
  const { width, height, expiresAt, gameId } = challenge;
  const [cells, setCells] = useState<PatternCell[]>(() =>
    Array<PatternCell>(width * height).fill(null),
  );
  const [shakeKey, setShakeKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(true);

  const leftMs = Math.max(0, expiresAt.getTime() - now.getTime());
  const expired = leftMs === 0;

  const verify = api.claim.verify.useMutation({
    onSuccess: (result) => {
      if (result.ok) return onSuccess(result);
      if (result.reason === "wrong") {
        setShakeKey((key) => key + 1);
        setError(
          `Nicht ganz. Noch ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "Versuch" : "Versuche"}.`,
        );
        return;
      }
      onEnd(
        result.reason === "tooManyAttempts"
          ? "Zu viele Versuche. Hol dir ein neues Muster aufs Spielfeld."
          : "Das Muster ist abgelaufen. Hol dir ein neues aufs Spielfeld.",
      );
    },
    onError: () => setError("Das hat nicht geklappt. Versuch es noch einmal."),
  });

  const complete = cells.every((cell) => cell !== null);

  return (
    <div className="flex flex-col gap-6">
      <StepHeader step={2} title="Tippe das Muster nach" />

      <p className="text-white/70">
        Schau aufs Spielfeld: In der Mitte leuchtet ein Muster aus{" "}
        <ColorName index={0} /> und <ColorName index={1} />. Tippe ein Feld so
        oft an, bis es dieselbe Farbe hat. Von welcher Seite du schaust, ist
        egal.
      </p>

      <div className="mx-auto w-full max-w-72">
        <PatternInput
          width={width}
          height={height}
          colors={CLAIM_COLORS}
          value={cells}
          onChange={(next) => {
            setCells(next);
            setError(null);
          }}
          shakeKey={shakeKey}
          disabled={expired || verify.isPending}
        />
      </div>

      <div
        className="flex flex-col gap-1.5"
        role="timer"
        aria-live="off"
        aria-label="Verbleibende Zeit"
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none ${leftMs < 20_000 ? "bg-neon-yellow" : "bg-neon-cyan"}`}
            style={{ width: `${(leftMs / CLAIM_PATTERN_TTL_MS) * 100}%` }}
          />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-white/60">
          <DynamicIcon name="Timer" size={16} />
          {expired
            ? "Das Muster ist abgelaufen."
            : `Noch ${Math.ceil(leftMs / 1000)} Sekunden`}
        </p>
      </div>

      <FormStatus error={error} />

      <div className="flex flex-col gap-2">
        {expired ? (
          <Button icon="Refresh" isPending={isRetrying} onClick={onRetry}>
            Neues Muster anzeigen
          </Button>
        ) : (
          <Button
            icon="Check"
            disabled={!complete || verify.isPending}
            isPending={verify.isPending}
            onClick={() =>
              verify.mutate({
                controllerId: padId,
                gameId,
                pattern: cells.map((cell) => cell ?? 0),
              })
            }
          >
            {complete ? "Prüfen" : "Erst alle Felder antippen"}
          </Button>
        )}
        <Button
          variant="ghost"
          tone="neutral"
          disabled={cells.every((cell) => cell === null)}
          onClick={() => setCells(cells.map(() => null))}
        >
          Zurücksetzen
        </Button>
      </div>
    </div>
  );
}

function ColorName({ index }: { index: 0 | 1 }) {
  const color = CLAIM_COLORS[index];
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-white">
      <span
        aria-hidden
        className="inline-block size-3 rounded-sm"
        style={{
          backgroundColor: color.hex,
          boxShadow: `0 0 0.5rem ${color.hex}`,
        }}
      />
      {color.name}
    </span>
  );
}

function ClaimSuccess({ claimed }: { claimed: Claimed }) {
  const { game, controller, gameId, savedToHistory } = claimed;
  return (
    <div className="flex flex-col gap-6">
      <StepHeader step={3} title="Gesichert!" />

      <div className="mx-auto w-40">
        <PixelGrid
          width={controller.width}
          height={controller.height}
          pixels={cellsToPixels(controller, game.data)}
          label={`Endstand von ${game.gameType.name}`}
        />
      </div>

      <p role="status" className="text-center text-white/80">
        {savedToHistory ? (
          <>
            <strong className="text-neon-green">{game.gameType.name}</strong>{" "}
            steht jetzt in deiner Historie.
          </>
        ) : (
          <>
            Dein Spiel <strong>{game.gameType.name}</strong> ist auf diesem
            Gerät gemerkt. Mit einem Konto landet es dauerhaft in deiner
            Historie.
          </>
        )}
      </p>

      <div className="flex flex-col gap-2">
        <Link href={`/spiele/${gameId}`} className={buttonClasses()}>
          <DynamicIcon name="MediaVideo" size={20} />
          Spiel ansehen
        </Link>
        <Link href="/historie" className={buttonClasses("outline", "neutral")}>
          <DynamicIcon name="Archive" size={20} />
          Meine Spiele
        </Link>
      </div>
    </div>
  );
}
