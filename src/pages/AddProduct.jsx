import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import API from "../api";

export default function AddProduct() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setUploading(true);

      let imageUrl = "";

      if (file) {
        const formDataUpload = new FormData();
        formDataUpload.append("image", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      }

      const res = await API.post("/products", {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image: imageUrl,
        sellerId: user?.id,
      });

      navigate("/seller-dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to create product");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Add Product</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <br /><br />

        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <br /><br />

        <input
          type="number"
          placeholder="Price"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />

        <br /><br />

        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <br /><br />

        <button type="submit" disabled={uploading}>
          {uploading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}
