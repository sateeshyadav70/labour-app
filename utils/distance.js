const toRadians = (value) => (value * Math.PI) / 180;

const isValidCoordinate = (coord) =>
  coord &&
  typeof coord.lat === "number" &&
  Number.isFinite(coord.lat) &&
  typeof coord.lng === "number" &&
  Number.isFinite(coord.lng);

const calculateDistanceKm = (from, to) => {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

module.exports = {
  calculateDistanceKm,
  isValidCoordinate,
};
