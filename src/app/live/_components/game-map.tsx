"use client";

import "leaflet/dist/leaflet.css";

import { divIcon, type DivIcon } from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { MUENSTER_CENTER, PAD_STATUS, type Pad, type PadStatus } from "./pads";
import { padMarkerHtml } from "./pad-marker";

const MARKER_SIZE = 32;

/** Keep in sync with the sheet's max height in game-details-panel.tsx. */
const SHEET_HEIGHT_RATIO = 0.6;

const markerIcon = (status: PadStatus, selected: boolean) =>
  divIcon({
    className: "",
    html: padMarkerHtml(status, selected),
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    tooltipAnchor: [MARKER_SIZE / 2 + 4, 0],
  });

const icons = Object.fromEntries(
  (Object.keys(PAD_STATUS) as PadStatus[]).map((status) => [
    status,
    { default: markerIcon(status, false), selected: markerIcon(status, true) },
  ]),
) as Record<PadStatus, Record<"default" | "selected", DivIcon>>;

/** Resize without resetting zoom, and pan only when the selection is out of view. */
function MapViewport({ selected }: { selected: Pad | undefined }) {
  const map = useMap();

  useEffect(() => {
    let frame: number;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        if (selected) {
          // On mobile the details sheet covers the lower part of the map.
          const sheetCovers = !window.matchMedia("(min-width: 48rem)").matches;
          const bottom = sheetCovers
            ? map.getContainer().clientHeight * SHEET_HEIGHT_RATIO
            : 40;
          map.panInside(selected.coordinates, {
            paddingTopLeft: [40, 40],
            paddingBottomRight: [40, bottom],
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
  selected: Pad | undefined;
  pads: Pad[];
  onSelect: (pad: Pad) => void;
}

export default function GameMap({ pads, selected, onSelect }: GameMapProps) {
  return (
    <MapContainer
      center={MUENSTER_CENTER}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport selected={selected} />
      {pads.map((location) => (
        <Marker
          key={location.id}
          position={location.coordinates}
          icon={
            icons[location.status][
              selected?.id === location.id ? "selected" : "default"
            ]
          }
          title={`${location.name}: ${PAD_STATUS[location.status].label}`}
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
          <Tooltip>
            {location.name} · {PAD_STATUS[location.status].label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
