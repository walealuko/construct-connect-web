import API from "./index";

export const fetchProducts = async () => {
  try {
    const res = await API.get("/products");
    return res.data;
  } catch (error) {
    console.error("Error fetching products: - fetchProducts.js:8", error);
    return [];
  }
};