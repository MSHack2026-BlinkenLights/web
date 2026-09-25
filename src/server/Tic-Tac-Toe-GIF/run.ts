import path from "node:path";
import { loadEnvFile } from "node:process";

loadEnvFile(path.resolve(import.meta.dirname, "../../../.env"));

const { createTicTacToeGif } = await import("./generate-tic-tac-toe-gif");

const gameId = process.argv[2] ?? "01a0d9c1-f110-7623-8237-878b1ad5d423";
const result = await createTicTacToeGif(gameId);

console.log(`GIF erstellt: ${result.gifPath}`);
console.log(`HTML erstellt: ${result.htmlPath}`);
