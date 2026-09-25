import { padGridStateSchema, type PadGridState } from "wbl/types/pad";

/**
 * Service layer for live pad data.
 *
 * The hardware interface is not defined yet, so this returns mock data.
 * Replace the body of `fetchPadGridState` with the real call (e.g. a tRPC
 * procedure `pad.gridState`) – components only depend on this function.
 */

const MOCK_LED_COLORS = [
  "#FF3B3B",
  "#FF9F1C",
  "#FFE14D",
  "#3DFF7A",
  "#22E4FF",
  "#3D6BFF",
  "#FF3DDB",
  "#FFFFFF",
] as const;

export async function fetchPadGridState(padId: string): Promise<PadGridState> {
  const raw = await mockRequest(padId);
  // Validate like a real network response, so malformed colors never reach inline styles.
  return padGridStateSchema.parse(raw);
}

async function mockRequest(padId: string): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const width = 3;
  const height = 3;
  const pixels = Array.from({ length: width * height }, () =>
    Math.random() < 0.3
      ? null
      : MOCK_LED_COLORS[Math.floor(Math.random() * MOCK_LED_COLORS.length)],
  );

  return { padId, width, height, pixels, updatedAt: new Date().toISOString() };
}
