export type GameLocation = {
  id: string;
  game: string;
  venue: string;
  coordinates: [latitude: number, longitude: number];
};

export const MUENSTER_CENTER: [number, number] = [51.9607, 7.6261];

/** Demo IDs identify fixtures, not database games or hardware pads. */
export const GAME_LOCATIONS: GameLocation[] = [
  {
    id: "prinzipalmarkt",
    game: "Pixel Snake",
    venue: "Prinzipalmarkt",
    coordinates: [51.9628, 7.6284],
  },
  {
    id: "schloss",
    game: "Light Pong",
    venue: "Schloss Münster",
    coordinates: [51.9634, 7.6131],
  },
  {
    id: "hafen",
    game: "Color Chase",
    venue: "Stadthafen",
    coordinates: [51.9498, 7.6386],
  },
  {
    id: "aasee",
    game: "Blinken Memory",
    venue: "Aasee",
    coordinates: [51.9557, 7.6108],
  },
];
