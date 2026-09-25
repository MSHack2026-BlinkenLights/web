# Tic-Tac-Toe GIF

`createTicTacToeGif(gameId)` liest die Züge eines einzelnen Spiels aus PostgreSQL.
Die Züge werden anhand der UUIDv7 chronologisch sortiert und nacheinander in ein
3x3-Board gezeichnet:

- blaue Züge werden als Kreis dargestellt
- rote Züge werden als Kreuz dargestellt

Die Methode schreibt `tic-tac-toe.gif` und eine `test.html` in diesen Ordner.

Beispiel:

```ts
import { createTicTacToeGif } from "./generate-tic-tac-toe-gif";

await createTicTacToeGif("GAME_UUID");
```
