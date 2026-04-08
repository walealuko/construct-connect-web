import React from "react";

function Wishlist() {
  const [wishlistItems, setWishlistItems] = React.useState([]);

  return (
    <div className="container">
      <h2>Wishlist</h2>
      {wishlistItems.length === 0 ? <p>Your wishlist is empty.</p> : (
        <div className="grid">
          {wishlistItems.map(item => (
            <div key={item.id} className="card">
              <h4>{item.name}</h4>
              <p>${item.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Wishlist;
