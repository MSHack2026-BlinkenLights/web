import { type PadStatus } from "./pads";

// Plain SVG strings, since a Leaflet divIcon takes HTML rather than React nodes.
const statusGlyphs: Record<PadStatus, string> = {
  free: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  playing: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  offline:
    '<path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
};

/**
 * Static HTML of a map pin, shared by the map and its legend.
 * Colors come from the `.pad-marker` styles in globals.css.
 */
export function padMarkerHtml(status: PadStatus, selected = false) {
  return `<span class="pad-marker" data-status="${status}"${selected ? " data-selected" : ""}><svg viewBox="0 0 24 24" width="60%" height="60%" aria-hidden="true">${statusGlyphs[status]}</svg></span>`;
}
