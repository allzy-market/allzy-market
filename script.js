const products = [
  {
    name: "Classic T-Shirt",
    image: "tshirt.jpg",
    price: 8500,
    category: "Fashion",
    description: "A comfortable everyday T-shirt."
  },
  {
    name: "Fashion Bag",
    price: 15000,
    category: "Bags",
    description: "A stylish bag for everyday use."
  },
  {
    name: "Fashion Slippers",
    price: 12000,
    category: "Shoes",
    description: "Comfortable slippers for everyday wear."
  }
];

const productList = document.getElementById("products");

if (productList) {
  productList.innerHTML = products.map(product => `
    <article class="product">
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <p>₦${product.price.toLocaleString("en-NG")}</p>
      <button onclick="addToCart('${product.name}', ${product.price})">
        Add to Cart
      </button>
    </article>
  `).join("");
}

let cart = [];

function displayCart() {
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");

  if (!cartItems || !cartTotal) return;

  if (cart.length === 0) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
    cartTotal.textContent = "Total: ₦0";
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <p><strong>${item.name}</strong></p>
      <p>Quantity: ${item.quantity}</p>
      <p>Price: ₦${item.price.toLocaleString("en-NG")}</p>
      <p>Subtotal: ₦${(item.price * item.quantity).toLocaleString("en-NG")}</p>
      <button onclick="removeFromCart('${item.name}')">Remove</button>
    </div>
  `).join("");

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  cartTotal.textContent = `Total: ₦${total.toLocaleString("en-NG")}`;
}

function addToCart(name, price) {
  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, quantity: 1 });
  }

  displayCart();
}

function removeFromCart(name) {
  cart = cart.filter(item => item.name !== name);
  displayCart();
}

displayCart();

function checkout() {
  if (cart.length === 0) {
    alert("Your shopping cart is empty. Please add a product first.");
    return;
  }

  alert("Checkout is coming next! Your cart total is ₦" +
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      .toLocaleString("en-NG"));
}
