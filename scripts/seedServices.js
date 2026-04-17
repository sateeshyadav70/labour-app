require("dotenv").config();

const mongoose = require("mongoose");
const Service = require("../models/Service");
const { HOME_SERVICES } = require("../data/homeCatalog");

async function seedServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await Service.deleteMany({});
    console.log("Cleared existing services");

    await Service.insertMany(
      HOME_SERVICES.map((service) => ({
        slug: service.id,
        serviceId: service.serviceId,
        name: service.title,
        title: service.title,
        category: service.category,
        description: service.description,
        color: service.color,
        basePrice: service.ratePerHour,
        ratePerHour: service.ratePerHour,
        image: null,
        illustrationKey: service.illustrationKey,
        badgeText: service.badgeText,
        sortOrder: service.sortOrder,
        includedScope: service.includedScope,
        optionalAddons: service.optionalAddons,
        skillTags: service.skillTags,
        durationMins: service.durationMins,
        cancellationNote: service.cancellationNote,
        featured: true,
        isActive: true,
      }))
    );

    console.log("Services seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding services:", error);
    process.exit(1);
  }
}

seedServices();
