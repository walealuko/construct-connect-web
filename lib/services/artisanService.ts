// src/services/artisanService.js

/**
 * Mock service for the Artisan Marketplace
 * Provides a directory of professional construction services in Nigeria
 */

const ARTISANS = [
  {
    id: "art-1",
    name: "Samuel Okonkwo",
    category: "Electricians",
    skills: ["Industrial Wiring", "Solar Panel Installation", "Generator Repair"],
    rate: "₦5,000/hr",
    image: "/assets/artisan1.jpg",
    location: "Lagos, Ikeja",
    bio: "Certified Master Electrician with 10+ years of experience in residential and commercial wiring.",
  },
  {
    id: "art-2",
    name: "Ibrahim Musa",
    category: "Plumbers",
    skills: ["Pipe Fitting", "Water Heater Installation", "Drainage Systems"],
    rate: "₦4,000/hr",
    image: "/assets/artisan2.jpg",
    location: "Abuja, Garki",
    bio: "Expert plumber specializing in modern plumbing systems and leak detection.",
  },
  {
    id: "art-3",
    name: "Chidi Eze",
    category: "Carpenters",
    skills: ["Cabinetry", "Roof Framing", "Custom Furniture"],
    rate: "₦4,500/hr",
    image: "/assets/artisan3.jpg",
    location: "Enugu, Independence Layout",
    bio: "Specialist in high-end cabinetry and structural timber work.",
  },
  {
    id: "art-4",
    name: "Ahmed Bello",
    category: "Masons/Bricklayers",
    skills: ["Block Work", "Plastering", "Tiling"],
    rate: "₦3,500/hr",
    image: "/assets/artisan4.jpg",
    location: "Kano, Nasarawa",
    bio: "Experienced mason focusing on durable structural walls and artistic plastering.",
  },
  {
    id: "art-5",
    name: "Olumide Adeyemi",
    category: "Painters",
    skills: ["Interior Painting", "Exterior Texture", "Wallpapers"],
    rate: "₦3,000/hr",
    image: "/assets/artisan5.jpg",
    location: "Lagos, Lekki",
    bio: "Professional painter specializing in modern interior finishes and weather-resistant exterior coats.",
  },
  {
    id: "art-6",
    name: "Tunde Bakare",
    category: "Tilers",
    skills: ["Ceramic Tiling", "Marble Installation", "Grouting"],
    rate: "₦4,000/hr",
    image: "/assets/artisan6.jpg",
    location: "Ibadan, Bodija",
    bio: "Precision tiling expert for bathrooms, kitchens, and large commercial floors.",
  },
  {
    id: "art-7",
    name: "Emeka Obi",
    category: "General",
    skills: ["Handyman Services", "Minor Repairs", "Assembly"],
    rate: "₦2,500/hr",
    image: "/assets/artisan7.jpg",
    location: "Port Harcourt, GRA",
    bio: "Versatile handyman for all your small home and office maintenance needs.",
  },
  {
    id: "art-8",
    name: "Fatima Yusuf",
    category: "Electricians",
    skills: ["Smart Home Setup", "Lighting Design", "Switchgear"],
    rate: "₦6,000/hr",
    image: "/assets/artisan8.jpg",
    location: "Abuja, Maitama",
    bio: "Specialist in smart home automation and high-end architectural lighting.",
  },
];

export const getArtisans = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return ARTISANS;
};

export const getArtisanById = async (id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const artisan = ARTISANS.find(a => a.id === id);
  if (!artisan) throw new Error("Artisan not found");
  return artisan;
};

export const getArtisansByCategory = async (category: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return ARTISANS.filter(a => a.category === category);
};
