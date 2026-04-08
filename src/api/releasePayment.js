import { generateClient } from "aws-amplify/api";
import { updateProducts } from "../graphql/mutations";

const client = generateClient();

export const releasePayment = async (productId) => {
  try {
    const result = await client.graphql({
      query: updateProducts,
      variables: {
        input: {
          id: productId,
          status: "PAID",
        },
      },
    });

    return result.data.updateProducts;
  } catch (error) {
    console.error("Error releasing payment: - releasePayment.js:20", error);
  }
};
