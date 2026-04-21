const estimateTimeMins = (distanceKm, avgSpeedKmh = 30) => {
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    typeof avgSpeedKmh !== "number" ||
    !Number.isFinite(avgSpeedKmh) ||
    avgSpeedKmh <= 0
  ) {
    return null;
  }

  return (distanceKm / avgSpeedKmh) * 60;
};

module.exports = estimateTimeMins;
