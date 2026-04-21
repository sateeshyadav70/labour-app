import { services as fallbackServices } from "./mockData";

const normalizeService = (service, index = 0) => ({
  id: service.id,
  title: service.title,
  description: service.description || "",
  color: service.color || "#0f172a",
  ratePerHour: service.ratePerHour ?? service.hourlyRate ?? service.price ?? 0,
  badgeText: service.badgeText || "",
  sortOrder: service.sortOrder ?? index + 1,
  illustrationKey: service.illustrationKey || service.id,
  image: service.image || service.imageUrl || null,
});

export const getFallbackServices = () =>
  [...fallbackServices]
    .map((service, index) => normalizeService(service, index))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

export const normalizeServices = (items) =>
  (Array.isArray(items) ? items : []).map((service, index) => normalizeService(service, index)).sort((a, b) => {
    const left = a.sortOrder ?? 0;
    const right = b.sortOrder ?? 0;
    return left - right;
  });

export const loadServices = async () => {
  return getFallbackServices();
};
