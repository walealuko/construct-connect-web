// src/services/marketplaceService.js

/**
 * Mock service to fetch marketplace products
 * Replace this with your real API call once backend is ready
 */

export const getProducts = async () => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  
    // Return mock products
    return [
      {
        id: "1",
        name: "Concrete Mixer",
        price: 120,
        image: "/assets/product1.png", // place a sample image in src/assets or use public/
      },
      {
        id: "2",
        name: "Cement Bag",
        price: 90,
        image: "/assets/product2.png",
      },
      {
        id: "3",
        name: "Hammer Drill",
        price: 75,
        image: "/assets/product3.png",
      },
      {
        id: "4",
        name: "Safety Helmet",
        price: 50,
        image: "/assets/product4.png",
      },
      {
        id: "5",
        name: "Steel Rod Set",
        price: 200,
        image: "/assets/product5.png",
      },
    ];
  };
  