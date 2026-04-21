module.exports = [
  {
    name: "Home Cleaning",
    category: "cleaning",
    description: "Professional home cleaning service",
    basePrice: 25,
    image: "/images/cleaning.jpg",
    includedScope: [
      "Dusting all surfaces",
      "Vacuuming carpets and floors",
      "Cleaning kitchen counters and appliances",
      "Bathroom cleaning",
      "Trash removal",
    ],
    optionalAddons: [
      {
        name: "Deep cleaning",
        price: 50,
        description: "Intensive cleaning of hard-to-reach areas",
      },
      {
        name: "Window cleaning",
        price: 30,
        description: "Interior and exterior window cleaning",
      },
    ],
  },
  {
    name: "Electrical Repair",
    category: "electrical",
    description: "Expert electrical repair and installation",
    basePrice: 40,
    image: "/images/electrical.jpg",
    includedScope: [
      "Electrical inspection",
      "Wiring repair",
      "Outlet installation",
      "Light fixture repair",
    ],
    optionalAddons: [
      {
        name: "Circuit breaker replacement",
        price: 80,
        description: "Replace faulty circuit breakers",
      },
      {
        name: "Generator installation",
        price: 200,
        description: "Install backup generator",
      },
    ],
  },
  {
    name: "House Painting",
    category: "painting",
    description: "Interior and exterior painting services",
    basePrice: 35,
    image: "/images/painting.jpg",
    includedScope: ["Surface preparation", "Primer application", "Paint application", "Cleanup"],
    optionalAddons: [
      { name: "Wallpaper removal", price: 25, description: "Remove old wallpaper" },
      { name: "Texture work", price: 45, description: "Add texture to walls" },
    ],
  },
];
