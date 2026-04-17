const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCoordinate = (lat, lng) => {
  const parsedLat = parseNumber(lat);
  const parsedLng = parseNumber(lng);

  if (parsedLat === null || parsedLng === null) {
    return null;
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
  };
};

const parseLocationInput = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return (
    parseCoordinate(
      value.lat ?? value.latitude ?? value.location?.lat ?? value.coords?.lat,
      value.lng ?? value.longitude ?? value.location?.lng ?? value.coords?.lng
    ) || null
  );
};

const parseCoordinateQuery = (query = {}) => {
  return (
    parseCoordinate(
      query.lat ??
        query.latitude ??
        query.userLat ??
        query.locationLat ??
        query["location.lat"] ??
        query["location[lat]"],
      query.lng ??
        query.longitude ??
        query.userLng ??
        query.locationLng ??
        query["location.lng"] ??
        query["location[lng]"]
    ) || null
  );
};

module.exports = {
  parseCoordinate,
  parseLocationInput,
  parseCoordinateQuery,
};
