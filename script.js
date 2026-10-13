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

function addToCart(name, price) {
  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name: name,
      price: price,
      quantity: 1
    });
  }

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  alert(
    `${name} added to your cart!\n` +
    `Items in cart: ${totalItems}`
  );
}
