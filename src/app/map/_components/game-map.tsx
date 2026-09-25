"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type GameLocation = {
  id: string;
  game: string;
  venue: string;
  coordinates: [latitude: number, longitude: number];
};

const MUENSTER_CENTER: [number, number] = [51.9607, 7.6261];

const GAME_LOCATIONS: GameLocation[] = [
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

export default function GameMap() {
  return (
    <MapContainer
      center={MUENSTER_CENTER}
      zoom={13}
      scrollWheelZoom
      className="h-[65vh] min-h-96 w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {GAME_LOCATIONS.map((location) => (
        <CircleMarker
          key={location.id}
          center={location.coordinates}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#a855f7",
            fillOpacity: 0.9,
            weight: 3,
          }}
        >
          <Popup>
            <strong>{location.game}</strong>
            <br />
            {location.venue}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
