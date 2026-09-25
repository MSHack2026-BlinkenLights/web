"use client";

import "leaflet/dist/leaflet.css";

import { divIcon } from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import {
  GAME_LOCATIONS,
  MUENSTER_CENTER,
  type GameLocation,
} from "./game-locations";

const markerIcon = (selected: boolean) =>
  divIcon({
    className: "",
    html: `<span style="display:block;width:28px;height:28px;border:3px solid white;border-radius:50%;background:${selected ? "#22e4ff" : "#a855f7"};box-shadow:0 0 0 ${selected ? "6px" : "2px"} ${selected ? "#22e4ff55" : "#00000022"}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [16, 0],
  });

const defaultIcon = markerIcon(false);
const selectedIcon = markerIcon(true);

/** Resize without resetting zoom, and pan only when the selection is out of view. */
function MapViewport({ selected }: { selected: GameLocation | undefined }) {
  const map = useMap();

  useEffect(() => {
    let frame: number;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        if (selected) {
          map.panInside(selected.coordinates, {
            padding: [40, 40],
            animate: false,
          });
        }
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(map.getContainer());
    update();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map, selected]);

  return null;
}

interface GameMapProps {
  selected: GameLocation | undefined;
  onSelect: (location: GameLocation) => void;
}

export default function GameMap({ selected, onSelect }: GameMapProps) {
  return (
    <MapContainer
      center={MUENSTER_CENTER}
      zoom={13}
      scrollWheelZoom
      className="h-full min-h-96 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport selected={selected} />
      {GAME_LOCATIONS.map((location) => (
        <Marker
          key={location.id}
          position={location.coordinates}
          icon={selected?.id === location.id ? selectedIcon : defaultIcon}
          title={`Watch ${location.game} at ${location.venue}`}
          alt={`Watch ${location.game} at ${location.venue}`}
          zIndexOffset={selected?.id === location.id ? 1000 : 0}
          eventHandlers={{
            click: () => onSelect(location),
            keydown: (event) => {
              if (
                event.originalEvent.key === "Enter" ||
                event.originalEvent.key === " "
              ) {
                event.originalEvent.preventDefault();
                event.originalEvent.stopPropagation();
                onSelect(location);
              }
            },
          }}
        >
          <Tooltip>{location.venue}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
