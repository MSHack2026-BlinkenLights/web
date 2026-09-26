/**
 * Rounds claimed in this browser, so players without an account find them
 * again. Only a convenience: storage may be unavailable or cleared any time.
 */

const STORAGE_KEY = "blinkin:claimed-games";
const MAX_ENTRIES = 50;

export interface LocalClaim {
  gameId: string;
  gameName: string;
  padName: string;
  /** ISO timestamp of the round's end. */
  endedAt: string;
}

export function readLocalClaims(): LocalClaim[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? (parsed as LocalClaim[]) : [];
  } catch {
    return [];
  }
}

export function addLocalClaim(claim: LocalClaim) {
  try {
    const others = readLocalClaims().filter((c) => c.gameId !== claim.gameId);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([claim, ...others].slice(0, MAX_ENTRIES)),
    );
  } catch {
    // Private mode or blocked storage: the success screen still shows the link.
  }
}
