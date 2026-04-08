// src/api/products.js
import { Amplify, API, graphqlOperation } from "aws-amplify";
import awsExports from "../aws-exports"; // Your Amplify config
import { listProducts } from "../graphql/queries"; // Generated GraphQL query

Amplify.configure(awsExports);

export async function fetchProducts() {
  try {
    const response = await API.graphql(graphqlOperation(listProducts));
    return response.data.listProducts.items;
  } catch (error) {
    console.error("Error fetching products: - fetchProducts.js:13", error);
    return [];
  }
}
