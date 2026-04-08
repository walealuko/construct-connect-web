import React from "react";

function Cart() {
  const [cartItems, setCartItems] = React.useState([]);

  return (
    <div className="container">
      <h2>Cart</h2>
      {cartItems.length === 0 ? <p>Your cart is empty.</p> : (
        <div className="grid">
          {cartItems.map(item => (
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

export default Cart;
