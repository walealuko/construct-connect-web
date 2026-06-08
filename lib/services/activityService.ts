// src/services/activityService.js

/**
 * Mock service to simulate user activity history
 */

const MOCK_ACTIVITIES = [
  {
    id: "act-1",
    type: "ORDER_PLACED",
    description: "Placed an order for Industrial Concrete Mixer",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: "Completed",
    icon: "📦",
  },
  {
    id: "act-2",
    type: "PAYMENT_CONFIRMED",
    description: "Payment confirmed for Steel Rod Set",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    status: "Success",
    icon: "✅",
  },
  {
    id: "act-3",
    type: "PROFILE_UPDATE",
    description: "Updated contact phone number",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    status: "Updated",
    icon: "👤",
  },
  {
    id: "act-4",
    type: "ITEM_ADDED",
    description: "Added Safety Helmet to wish list",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    status: "Saved",
    icon: "⭐",
  },
  {
    id: "act-5",
    type: "ORDER_PLACED",
    description: "Placed an order for Portland Cement (50kg Bag)",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    status: "Shipped",
    icon: "🚚",
  },
];

export const getUserActivities = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return MOCK_ACTIVITIES.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
