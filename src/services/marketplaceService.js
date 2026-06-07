// src/services/marketplaceService.js

/**
 * Mock service to fetch marketplace products
 * This provides a rich dataset of construction materials, tools, and equipment
 */

const SAMPLE_PRODUCTS = [
  // Heavy Machinery
  {
    id: "hm-1",
    name: "Industrial Concrete Mixer",
    price: 1200.00,
    category: "Heavy Machinery",
    description: "High-capacity industrial concrete mixer with 300L drum, durable steel construction, and high-torque motor.",
    image: "/assets/concrete-mixer.png",
    rating: 4.8,
    stockStatus: "in-stock",
    stock: 5,
  },
  {
    id: "hm-2",
    name: "Mini Excavator (Compact)",
    price: 15000.00,
    category: "Heavy Machinery",
    description: "Versatile mini excavator perfect for urban construction sites and tight spaces. Fuel-efficient and easy to operate.",
    image: "/assets/mini-excavator.png",
    rating: 4.5,
    stockStatus: "low-stock",
    stock: 2,
  },
  {
    id: "hm-3",
    name: "Plate Compactor (Vibratory)",
    price: 850.00,
    category: "Heavy Machinery",
    description: "Professional grade vibratory plate compactor for soil and asphalt. High centrifugal force for maximum compaction.",
    image: "/assets/plate-compactor.png",
    rating: 4.2,
    stockStatus: "in-stock",
    stock: 10,
  },
  {
    id: "hm-4",
    name: "Diesel Generator (10kVA)",
    price: 2200.00,
    category: "Heavy Machinery",
    description: "Heavy-duty silent diesel generator, ideal for powering construction sites and remote locations.",
    image: "/assets/generator.png",
    rating: 4.7,
    stockStatus: "in-stock",
    stock: 4,
  },

  // Hand Tools
  {
    id: "ht-1",
    name: "SDS Max Hammer Drill",
    price: 350.00,
    category: "Hand Tools",
    description: "Professional SDS Max hammer drill with variable speed control and high impact energy for heavy-duty drilling.",
    image: "/assets/hammer-drill.png",
    rating: 4.9,
    stockStatus: "in-stock",
    stock: 25,
  },
  {
    id: "ht-2",
    name: "Self-Leveling Laser Level",
    price: 180.00,
    category: "Hand Tools",
    description: "Precision 360-degree green beam laser level for accurate alignment and leveling on any project.",
    image: "/assets/laser-level.png",
    rating: 4.6,
    stockStatus: "in-stock",
    stock: 15,
  },
  {
    id: "ht-3",
    name: "Digital Measuring Tape (50m)",
    price: 95.00,
    category: "Hand Tools",
    description: "High-precision digital measuring tape with LCD display and automatic measurement lock.",
    image: "/assets/digital-tape.png",
    rating: 4.3,
    stockStatus: "low-stock",
    stock: 8,
  },
  {
    id: "ht-4",
    name: "Professional Heavy Duty Wrench Set",
    price: 120.00,
    category: "Hand Tools",
    description: "12-piece chrome vanadium steel wrench set, corrosion-resistant and built for extreme torque.",
    image: "/assets/wrench-set.png",
    rating: 4.7,
    stockStatus: "in-stock",
    stock: 30,
  },

  // Safety Gear
  {
    id: "sg-1",
    name: "Industrial Hard Hat (Ventilated)",
    price: 25.00,
    category: "Safety Gear",
    description: "High-impact resistant safety helmet with adjustable chin strap and ventilation system.",
    image: "/assets/hard-hat.png",
    rating: 4.8,
    stockStatus: "in-stock",
    stock: 100,
  },
  {
    id: "sg-2",
    name: "Steel-Toe Safety Boots (Waterproof)",
    price: 85.00,
    category: "Safety Gear",
    description: "Reinforced steel-toe boots with waterproof lining and anti-slip sole for maximum site safety.",
    image: "/assets/safety-boots.png",
    rating: 4.4,
    stockStatus: "in-stock",
    stock: 50,
  },
  {
    id: "sg-3",
    name: "High-Visibility Reflective Vest",
    price: 15.00,
    category: "Safety Gear",
    description: "Breathable mesh safety vest with 3M reflective strips for maximum visibility in low-light conditions.",
    image: "/assets/hi-vis-vest.png",
    rating: 4.1,
    stockStatus: "in-stock",
    stocks: 200,
  },
  {
    id: "sg-4",
    name: "Anti-Fog Industrial Safety Goggles",
    price: 20.00,
    category: "Safety Gear",
    description: "Scratch-resistant, anti-fog goggles with adjustable strap and full-seal protection.",
    image: "/assets/safety-goggles.png",
    rating: 4.6,
    stockStatus: "in-stock",
    stock: 75,
  },

  // Consumables
  {
    id: "cn-1",
    name: "Portland Cement (50kg Bag)",
    price: 8000.00,
    category: "Consumables",
    description: "Premium Grade 42.5R Portland Cement for high-strength concrete and plastering work.",
    image: "/assets/cement-bag.png",
    rating: 4.9,
    stockStatus: "in-stock",
    stock: 500,
  },
  {
    id: "cn-2",
    name: "TMT Steel Rods (12mm - 6m)",
    price: 4500.00,
    category: "Consumables",
    description: "High-tensile TMT reinforcement bars for structural stability in slabs and columns.",
    image: "/assets/steel-rods.png",
    rating: 4.7,
    stockStatus: "in-stock",
    stock: 1000,
  },
  {
    id: "cn-3",
    name: "Industrial Waterproof Sealant (5L)",
    price: 320.00,
    category: "Consumables",
    description: "High-performance elastomeric sealant for roofs and joints, UV resistant and long-lasting.",
    image: "/assets/sealant.png",
    rating: 4.3,
    stockStatus: "low-stock",
    stock: 12,
  },
  {
    id: "cn-4",
    name: "Sharp Sand (Per Tonne)",
    price: 15000.00,
    category: "Consumables",
    description: "Clean, screened sharp sand suitable for concrete mixing and masonry work.",
    image: "/assets/sharp-sand.png",
    rating: 4.0,
    stockStatus: "in-stock",
    stock: 50,
  },
];

export const getProducts = async () => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return SAMPLE_PRODUCTS;
};

export const getProductById = async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const product = SAMPLE_PRODUCTS.find(p => p.id === id);
    if (!product) throw new Error("Product not found");
    return product;
};

export const getProductsByCategory = async (category) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return SAMPLE_PRODUCTS.filter(p => p.category === category);
};
