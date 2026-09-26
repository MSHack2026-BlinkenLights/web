export type LatLng = [latitude: number, longitude: number];

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters (haversine). */
export function distanceInMeters([lat1, lng1]: LatLng, [lat2, lng2]: LatLng) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** "350 m" below one kilometer, otherwise "1,2 km". */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
}
