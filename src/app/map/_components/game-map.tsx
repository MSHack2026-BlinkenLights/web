"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import { GAME_LOCATIONS, MUENSTER_CENTER } from "./game-locations";

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
