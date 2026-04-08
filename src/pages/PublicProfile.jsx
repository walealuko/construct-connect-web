import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { generateClient } from "aws-amplify/api";
import { getUsers, listProducts } from "../graphql/queries";
import { getUrl } from "aws-amplify/storage";

const client = generateClient();

export default function PublicProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchUserAndProducts();
  }, []);

  const fetchUserAndProducts = async () => {
    try {
      // Fetch user
      const userResult = await client.graphql({
        query: getUsers,
        variables: { id },
      });
      const userData = userResult.data.getUsers;

      let imageUrl = "";
      if (userData.profileImage) {
        const img = await getUrl({ key: userData.profileImage });
        imageUrl = img.url.toString();
      }
      setUser({ ...userData, imageUrl });

      // Fetch user's products
      const productResult = await client.graphql({
        query: listProducts,
        filter: { owner: { eq: id } },
      });

      const productsWithImages = await Promise.all(
        productResult.data.listProducts.items.map(async (product) => {
          let productImageUrl = "";
          if (product.image) {
            const img = await getUrl({ key: product.image });
            productImageUrl = img.url.toString();
          }
          return { ...product, imageUrl: productImageUrl };
        })
      );

      setProducts(productsWithImages);
    } catch (error) {
      console.error("Error fetching public profile:", error);
    }
  };

  if (!user) return <div style={{ padding: "40px" }}>Loading...</div>;

  return (
    <div style={{ padding: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        {user.imageUrl && (
          <img
            src={user.imageUrl}
            alt={user.username}
            style={{ width: "120px", height: "120px", borderRadius: "50%", marginRight: "20px" }}
          />
        )}
        <div>
          <h2>{user.username}</h2>
          <p>Role: {user.role}</p>
        </div>
      </div>

      {products.length > 0 ? (
        <div>
          <h3>Products</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "20px",
            }}
          >
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: "10px",
                    borderRadius: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    transition: "transform 0.2s",
                    textAlign: "center",
                  }}
                  className="product-card"
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "5px" }}
                    />
                  )}
                  <div style={{ marginTop: "5px" }}>
                    <strong>{product.name}</strong>
                  </div>
                  <div>₦{product.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p>No products yet.</p>
      )}
    </div>
  );
}
