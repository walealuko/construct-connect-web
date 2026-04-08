// src/api/createOrder.js
import { calculateCommission } from "../utils/commission";

export async function initiateEscrow(product, buyerId) {
  try {
    const { commission, sellerAmount } = calculateCommission(product.price);

    const input = {
      productId: product.id,
      buyerId,
      sellerId: product.sellerId,
      amount: product.price,
      commission,
      sellerAmount,
      status: "PENDING",
    };

    // Send to backend API to create the escrow/order
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to create escrow order");
    }

    const createdOrder = await response.json();
    return createdOrder;

  } catch (error) {
    console.error("Error initiating escrow: - createOrder.js:33", error);
    return null;
  }
}
