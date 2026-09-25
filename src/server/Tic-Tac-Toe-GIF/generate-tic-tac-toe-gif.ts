import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import gifenc from "gifenc";

import { db } from "../db";

const { applyPalette, GIFEncoder, quantize } = gifenc;

type Move = {
  id: string;
  x: number;
  y: number;
  colorHex: string;
  symbol: "cross" | "circle";
};

type Board = Array<Move | undefined>;

const BOARD_SIZE = 360;
const CELL_SIZE = BOARD_SIZE / 3;
const FRAME_DELAY = 900;
const FINAL_FRAME_DELAY = 2200;

const outputDirectory = import.meta.dirname;
const gifPath = path.join(outputDirectory, "tic-tac-toe.gif");
const htmlPath = path.join(outputDirectory, "test.html");

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid color value: ${hex}`);
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function drawPixel(
  pixels: Uint8Array,
  x: number,
  y: number,
  color: [number, number, number],
): void {
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

  const offset = (y * BOARD_SIZE + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = 255;
}

function drawLine(
  pixels: Uint8Array,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: [number, number, number],
  thickness = 5,
): void {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  for (let step = 0; step <= steps; step += 1) {
    const progress = steps === 0 ? 0 : step / steps;
    const x = Math.round(startX + (endX - startX) * progress);
    const y = Math.round(startY + (endY - startY) * progress);

    for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
      for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) {
        if (offsetX * offsetX + offsetY * offsetY <= thickness * thickness) {
          drawPixel(pixels, x + offsetX, y + offsetY, color);
        }
      }
    }
  }
}

function drawDot(
  pixels: Uint8Array,
  centerX: number,
  centerY: number,
  color: [number, number, number],
): void {
  const radius = 5;
  for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
        drawPixel(
          pixels,
          Math.round(centerX + offsetX),
          Math.round(centerY + offsetY),
          color,
        );
      }
    }
  }
}

function drawDotPattern(
  pixels: Uint8Array,
  centerX: number,
  centerY: number,
  pattern: string[],
  color: [number, number, number],
): void {
  const spacing = 15;
  const offset = ((pattern.length - 1) * spacing) / 2;

  for (const [row, line] of pattern.entries()) {
    for (const [column, value] of [...line].entries()) {
      if (value === "1") {
        drawDot(
          pixels,
          centerX + column * spacing - offset,
          centerY + row * spacing - offset,
          color,
        );
      }
    }
  }
}

function renderFrame(board: Board): Uint8Array {
  const pixels = new Uint8Array(BOARD_SIZE * BOARD_SIZE * 4);
  const background: [number, number, number] = [0, 0, 0];
  const grid: [number, number, number] = [45, 45, 45];

  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    pixels[index * 4] = background[0];
    pixels[index * 4 + 1] = background[1];
    pixels[index * 4 + 2] = background[2];
    pixels[index * 4 + 3] = 255;
  }

  for (const position of [1, 2]) {
    const coordinate = Math.round(position * CELL_SIZE);
    drawLine(pixels, coordinate, 0, coordinate, BOARD_SIZE, grid, 3);
    drawLine(pixels, 0, coordinate, BOARD_SIZE, coordinate, grid, 3);
  }

  for (const move of board) {
    if (!move) continue;
    const centerX = move.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = move.y * CELL_SIZE + CELL_SIZE / 2;
    const moveColor = hexToRgb(move.colorHex);

    if (move.symbol === "cross") {
      drawDotPattern(
        pixels,
        centerX,
        centerY,
        ["10001", "01010", "00100", "01010", "10001"],
        moveColor,
      );
    } else {
      drawDotPattern(
        pixels,
        centerX,
        centerY,
        ["01110", "10001", "10001", "10001", "01110"],
        moveColor,
      );
    }
  }

  return pixels;
}

function boardIndex(x: number, y: number): number {
  return y * 3 + x;
}

function createHtml(): string {
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tic-Tac-Toe GIF</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #000; color: #d1d5db; font: 14px "Courier New", monospace; }
      main { width: min(92vw, 520px); padding: 24px; border: 2px solid #303030; background: #080808; text-align: center; }
      h1 { margin: 0 0 8px; color: #fff; font-size: 20px; letter-spacing: 0.12em; text-transform: uppercase; }
      p { margin: 0 0 20px; color: #777; }
      img { display: block; width: min(90vw, 360px); margin: 0 auto; border: 2px solid #444; border-radius: 0; image-rendering: pixelated; }
      .status { margin-top: 18px; color: #666; letter-spacing: 0.08em; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main>
      <h1>Tic-Tac-Toe Spielablauf</h1>
      <p>MICROCONTROLLER DISPLAY / GAME DATA STREAM</p>
      <img src="tic-tac-toe.gif" alt="Animierter Ablauf eines Tic-Tac-Toe-Spiels">
      <div class="status">X = CROSS / O = CIRCLE</div>
    </main>
  </body>
</html>
`;
}

export async function createTicTacToeGif(gameId: string): Promise<{
  gifPath: string;
  htmlPath: string;
}> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      data: {
        select: {
          id: true,
          x: true,
          y: true,
          colorHex: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  if (game.data.length === 0) {
    throw new Error(`Game has no moves: ${gameId}`);
  }

  const encoder = GIFEncoder();
  const board: Board = Array.from({ length: 9 });

  for (const [index, storedMove] of game.data.entries()) {
    const move: Move = {
      ...storedMove,
      symbol: index % 2 === 0 ? "cross" : "circle",
    };

    if (
      !Number.isInteger(move.x) ||
      !Number.isInteger(move.y) ||
      move.x < 0 ||
      move.x > 2 ||
      move.y < 0 ||
      move.y > 2
    ) {
      throw new Error(`Move ${move.id} has coordinates outside a 3x3 board`);
    }

    const position = boardIndex(move.x, move.y);
    if (board[position]) {
      throw new Error(
        `Position ${move.x},${move.y} is used more than once in game ${game.id}`,
      );
    }

    board[position] = move;
    const pixels = renderFrame(board);
    const palette = quantize(pixels, 256);
    const indexedPixels = applyPalette(pixels, palette);
    encoder.writeFrame(indexedPixels, BOARD_SIZE, BOARD_SIZE, {
      palette,
      delay: index === game.data.length - 1 ? FINAL_FRAME_DELAY : FRAME_DELAY,
    });
  }

  encoder.finish();
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(gifPath, Buffer.from(encoder.bytes()));
  await writeFile(htmlPath, createHtml(), "utf8");

  return { gifPath, htmlPath };
}
