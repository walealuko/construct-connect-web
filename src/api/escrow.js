// src/api/escrow.js
import { API } from "aws-amplify";

export async function releasePayment(productId) {
  try {
    const result = await API.put("/escrow", { productId });
    console.log("Payment released:", result);
    return result;
  } catch (err) {
    console.error("Error releasing payment:", err);
    return null;
  }
}
