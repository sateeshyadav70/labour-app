const Service = require("../models/Service");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { normalizeId, HOME_SERVICES, buildServiceCard, buildServiceDetail } = require("../data/homeCatalog");

const SERVICE_DB_TIMEOUT_MS = Number(process.env.SERVICES_DB_TIMEOUT_MS || 1200);
const SERVICE_CACHE_TTL_MS = Number(process.env.SERVICES_CACHE_TTL_MS || 5 * 60 * 1000);

let cachedMergedServices = null;
let cachedAt = 0;

const withTimeout = (promise, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const toHomeService = (doc, fallback = null) => {
  const base = fallback || {};
  const title = doc.title || doc.name || base.title;
  const id = normalizeId(doc.slug || doc.serviceId || title || doc.category || doc._id);

  return {
    id,
    title,
    description: doc.description || base.description || "",
    color: doc.color || base.color || "#0F172A",
    ratePerHour: Number.isFinite(Number(doc.ratePerHour))
      ? Number(doc.ratePerHour)
      : Number.isFinite(Number(doc.basePrice))
      ? Number(doc.basePrice)
      : base.ratePerHour || 0,
    badgeText: doc.badgeText || base.badgeText || "",
    sortOrder: Number.isFinite(Number(doc.sortOrder)) ? Number(doc.sortOrder) : base.sortOrder || 0,
    illustrationKey: doc.illustrationKey || base.illustrationKey || id,
    serviceId: doc.serviceId || id,
    category: doc.category || base.category || "cleaning",
    skillTags: Array.isArray(doc.skillTags) && doc.skillTags.length ? doc.skillTags : base.skillTags || [],
    durationMins:
      Number.isFinite(Number(doc.durationMins)) ? Number(doc.durationMins) : base.durationMins || null,
    cancellationNote: doc.cancellationNote || base.cancellationNote || null,
    includedScope: Array.isArray(doc.includedScope) && doc.includedScope.length
      ? doc.includedScope
      : base.includedScope || [],
    optionalAddons: Array.isArray(doc.optionalAddons) && doc.optionalAddons.length
      ? doc.optionalAddons
      : base.optionalAddons || [],
  };
};

const normalizeDocs = (docs = []) => {
  const docMap = new Map();

  for (const doc of docs) {
    const keys = [
      normalizeId(doc.slug),
      normalizeId(doc.serviceId),
      normalizeId(doc.title),
      normalizeId(doc.name),
      normalizeId(doc.category),
      normalizeId(doc._id),
    ].filter(Boolean);

    for (const key of keys) {
      if (!docMap.has(key)) {
        docMap.set(key, doc);
      }
    }
  }

  return docMap;
};

const mergeCatalog = async () => {
  const services = await withTimeout(
    Service.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }),
    SERVICE_DB_TIMEOUT_MS,
    "Service lookup timed out"
  );

  const docMap = normalizeDocs(services);
  const merged = HOME_SERVICES.map((fallback) => {
    const match =
      docMap.get(normalizeId(fallback.id)) ||
      docMap.get(normalizeId(fallback.serviceId)) ||
      docMap.get(normalizeId(fallback.title)) ||
      docMap.get(normalizeId(fallback.category));

    return match ? toHomeService(match, fallback) : fallback;
  });

  return {
    services: merged.sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)),
    source: services.length ? "database" : "catalog",
  };
};

const getServiceList = async () => {
  if (cachedMergedServices && Date.now() - cachedAt < SERVICE_CACHE_TTL_MS) {
    return { services: cachedMergedServices, source: "cache" };
  }

  try {
    const merged = await mergeCatalog();
    cachedMergedServices = merged.services;
    cachedAt = Date.now();
    return merged;
  } catch (error) {
    cachedMergedServices = HOME_SERVICES.map((service) => buildServiceCard(service));
    cachedAt = Date.now();
    return { services: cachedMergedServices, source: "fallback" };
  }
};

const findServiceById = async (serviceId) => {
  const normalized = normalizeId(serviceId);
  const { services } = await getServiceList();
  const service = services.find((item) => normalizeId(item.id) === normalized);

  if (service) {
    return service;
  }

  try {
    const doc = await withTimeout(
      Service.findOne({
        $or: [
          { slug: normalized },
          { serviceId: normalized },
          { name: new RegExp(`^${normalized.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
          { category: normalized },
        ],
      }),
      SERVICE_DB_TIMEOUT_MS,
      "Service lookup timed out"
    );

    return doc ? toHomeService(doc) : null;
  } catch (error) {
    return null;
  }
};

exports.getServices = async (req, res) => {
  try {
    const { services, source } = await getServiceList();

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.set("X-Data-Source", source);

    return sendSuccess(res, "Services fetched successfully", {
      services: services.map((service) => buildServiceCard(service)),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const service = await findServiceById(req.params.id);

    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

    return sendSuccess(res, "Service fetched successfully", {
      service: buildServiceDetail(service),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { services, source } = await getServiceList();
    const normalizedCategory = normalizeId(category);

    const filteredServices = services.filter(
      (service) => normalizeId(service.category) === normalizedCategory
    );

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.set("X-Data-Source", source);

    return sendSuccess(res, "Services fetched successfully", {
      services: filteredServices.map((service) => buildServiceCard(service)),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getServiceCatalogForWorkerFilter = async (serviceId) => {
  const service = await findServiceById(serviceId);
  return service ? service.skillTags || [] : [];
};
