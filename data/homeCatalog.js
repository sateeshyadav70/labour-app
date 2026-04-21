const APP_NAME = process.env.APP_NAME || "Fixora";
const SUPPORT_TEXT = process.env.SUPPORT_TEXT || "Fast, reliable home services on demand";
const HOME_TITLE = process.env.HOME_TITLE || "Book trusted help in minutes";
const HOME_SUBTITLE =
  process.env.HOME_SUBTITLE ||
  "Pick a service, pin your location, and get nearby workers with live tracking.";
const HOME_BADGE_TEXT = process.env.HOME_BADGE_TEXT || "Available near you";

const HOME_CHIPS = (process.env.HOME_DEFAULT_CHIPS || "Fast arrival,Live tracking,Verified workers")
  .split(",")
  .map((chip) => chip.trim())
  .filter(Boolean);

const HOME_SERVICES = [
  {
    id: "sweeping",
    title: "Sweeping",
    description: "Quick floor sweeping for rooms, halls, and balconies.",
    color: "#0F172A",
    ratePerHour: 149,
    badgeText: "Popular",
    sortOrder: 1,
    illustrationKey: "sweeping",
    serviceId: "sweeping",
    category: "cleaning",
    skillTags: ["sweeping", "floor cleaning", "floor-cleaning", "cleaning"],
    durationMins: 30,
    cancellationNote: "Free cancellation up to 30 minutes before visit.",
    includedScope: ["Floor sweeping", "Dust collection", "Entryway cleanup"],
    optionalAddons: [
      { name: "Dusting add-on", price: 50, description: "Add surface dusting to the visit." },
    ],
  },
  {
    id: "mopping",
    title: "Mopping",
    description: "Deep wet mopping for tiles, marble, and high-traffic areas.",
    color: "#155E75",
    ratePerHour: 179,
    badgeText: "Best value",
    sortOrder: 2,
    illustrationKey: "mopping",
    serviceId: "mopping",
    category: "cleaning",
    skillTags: ["mopping", "floor cleaning", "floor-cleaning", "cleaning"],
    durationMins: 40,
    cancellationNote: "Free cancellation up to 30 minutes before visit.",
    includedScope: ["Wet mopping", "Spot stain cleanup", "Dry finish"],
    optionalAddons: [
      { name: "Floor polish", price: 120, description: "Light polishing after mopping." },
    ],
  },
  {
    id: "dusting",
    title: "Dusting",
    description: "Surface dusting for shelves, furniture, fans, and corners.",
    color: "#7C2D12",
    ratePerHour: 129,
    badgeText: "Quick cleanup",
    sortOrder: 3,
    illustrationKey: "dusting",
    serviceId: "dusting",
    category: "cleaning",
    skillTags: ["dusting", "surface cleaning", "cleaning"],
    durationMins: 25,
    cancellationNote: "Free cancellation up to 30 minutes before visit.",
    includedScope: ["Shelf dusting", "Furniture wipe-down", "Fan dust removal"],
    optionalAddons: [
      { name: "Cobweb removal", price: 40, description: "Remove cobwebs from corners and ceilings." },
    ],
  },
  {
    id: "window",
    title: "Window",
    description: "Interior window cleaning for a brighter, clearer finish.",
    color: "#1D4ED8",
    ratePerHour: 199,
    badgeText: "Sparkling finish",
    sortOrder: 4,
    illustrationKey: "window",
    serviceId: "window",
    category: "cleaning",
    skillTags: ["window cleaning", "glass cleaning", "cleaning"],
    durationMins: 45,
    cancellationNote: "Free cancellation up to 45 minutes before visit.",
    includedScope: ["Glass wipe-down", "Frame cleaning", "Sill cleaning"],
    optionalAddons: [
      { name: "Exterior window wash", price: 120, description: "Exterior side cleaning where reachable." },
    ],
  },
  {
    id: "staircase",
    title: "Staircase",
    description: "Detailed stair and railing cleaning for multi-level spaces.",
    color: "#4C1D95",
    ratePerHour: 219,
    badgeText: "Multi-level",
    sortOrder: 5,
    illustrationKey: "staircase",
    serviceId: "staircase",
    category: "cleaning",
    skillTags: ["staircase cleaning", "floor cleaning", "cleaning"],
    durationMins: 50,
    cancellationNote: "Free cancellation up to 45 minutes before visit.",
    includedScope: ["Step cleaning", "Railing wipe-down", "Landing cleanup"],
    optionalAddons: [
      { name: "Deep scrub", price: 130, description: "Extra scrubbing for dirty stair zones." },
    ],
  },
];

const sortServices = (services) =>
  [...services].sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));

const normalizeId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getHomeConfig = () => ({
  appName: APP_NAME,
  supportText: SUPPORT_TEXT,
  hero: {
    title: HOME_TITLE,
    subtitle: HOME_SUBTITLE,
    badgeText: HOME_BADGE_TEXT,
  },
  chips: HOME_CHIPS,
  theme: {
    brandColor: process.env.BRAND_COLOR || "#0F172A",
    accentColor: process.env.ACCENT_COLOR || "#F59E0B",
    surfaceColor: process.env.SURFACE_COLOR || "#FFF8F0",
  },
  featuredServiceIds: sortServices(HOME_SERVICES).map((service) => service.id),
});

const buildServiceCard = (service) => ({
  id: service.id,
  title: service.title,
  description: service.description,
  color: service.color,
  ratePerHour: service.ratePerHour,
  badgeText: service.badgeText,
  sortOrder: service.sortOrder,
  illustrationKey: service.illustrationKey,
});

const buildServiceDetail = (service) => ({
  ...buildServiceCard(service),
  serviceId: service.serviceId || service.id,
  category: service.category || "cleaning",
  skillTags: service.skillTags || [],
  durationMins: service.durationMins || null,
  cancellationNote: service.cancellationNote || null,
  includedScope: service.includedScope || [],
  optionalAddons: service.optionalAddons || [],
  bookingSummary: {
    serviceId: service.serviceId || service.id,
    title: service.title,
    description: service.description,
    ratePerHour: service.ratePerHour,
    estimatedAmount: service.ratePerHour,
    durationMins: service.durationMins || null,
    badgeText: service.badgeText,
    illustrationKey: service.illustrationKey,
    cancellationNote: service.cancellationNote || null,
  },
});

const findHomeServiceById = (id) => {
  const normalized = normalizeId(id);

  if (!normalized) {
    return null;
  }

  return HOME_SERVICES.find((service) => {
    return (
      normalizeId(service.id) === normalized ||
      normalizeId(service.serviceId) === normalized ||
      normalizeId(service.title) === normalized
    );
  });
};

const getHomeServiceSkillTags = (serviceId) => {
  const service = findHomeServiceById(serviceId);
  return service ? service.skillTags || [] : [];
};

module.exports = {
  APP_NAME,
  SUPPORT_TEXT,
  HOME_SERVICES: sortServices(HOME_SERVICES),
  getHomeConfig,
  buildServiceCard,
  buildServiceDetail,
  findHomeServiceById,
  getHomeServiceSkillTags,
  normalizeId,
  sortServices,
};
