const SUPABASE_URL = "https://xdmuygtrzqznbywvzypl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UGRcI_2l6Vpl7QroGTVFiw_J818DtOC";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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

async function loadProducts() {
  const productList = document.getElementById("products");

  if (!productList) return;

  productList.innerHTML = "<p>Loading products...</p>";

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_available", true);

  if (error) {
    console.error("Could not load products:", error);
    productList.innerHTML = "<p>Unable to load products. Please try again later.</p>";
    return;
  }

  if (!data || data.length === 0) {
    productList.innerHTML = "<p>No products available yet.</p>";
    return;
  }

  productList.innerHTML = data.map((product, index) => `
  <article class="product">
    <h3>${product.name}</h3>
    <p>${product.description || ""}</p>
    <p>₦${Number(product.price).toLocaleString("en-NG")}</p>
    <button type="button" class="add-to-cart" data-index="${index}">
      Add to Cart
    </button>
  </article>
`).join("");

productList.querySelectorAll(".add-to-cart").forEach(button => {
  button.addEventListener("click", function() {
    const product = data[Number(this.dataset.index)];

    if (!product) {
      alert("Unable to find this product. Please refresh and try again.");
      return;
    }

    window.addToCart(
      Number(product.id),
      product.name,
      Number(product.price)
    );
  });
});
}

loadProducts();

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

window.addToCart = function(id, name, price) {
  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
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

  const checkoutForm = document.getElementById("checkout-form");

  if (checkoutForm) {
    checkoutForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

const orderForm = document.getElementById("customer-order-form");

if (orderForm) {
  orderForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (cart.length === 0) {
      alert("Your cart is empty. Please add products first.");
      return;
    }

    const customerName = document.getElementById("customer-name").value.trim();
    const customerPhone = document.getElementById("customer-phone").value.trim();
    const customerAddress = document.getElementById("customer-address").value.trim();
    const customerCity = document.getElementById("customer-city").value.trim();
    const customerState = document.getElementById("customer-state").value.trim();

    if (!customerName || !customerPhone || !customerAddress ||
        !customerCity || !customerState) {
      alert("Please complete all delivery details.");
      return;
    }

    const submitButton = orderForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting Order...";
    }

    try {
      const { data, error } = await supabaseClient.functions.invoke(
        "submit-order",
        {
          body: {
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_address: customerAddress,
            delivery_city: customerCity,
            delivery_state: customerState,
            items: cart.map(item => ({
              product_id: item.id,
              quantity: item.quantity
            }))
          }
        }
      );

      if (error) {
        console.error("Order submission failed:", error);
        alert("We couldn't submit your order. Please try again.");
        return;
      }

      if (!data || !data.success) {
        alert(data?.error || "We couldn't submit your order. Please try again.");
        return;
      }

      alert(
        "Thank you! Your order has been submitted successfully.\n\n" +
        "Order number: " + data.order_id + "\n" +
        "Total: ₦" + Number(data.total_amount).toLocaleString("en-NG")
      );

      cart = [];
      displayCart();
      orderForm.reset();

    } catch (error) {
      console.error("Order submission error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Place Order";
      }
    }
  });
}

console.log("Supabase library loaded:", !!window.supabase);
console.log("Allzy Market Supabase client created:", !!supabaseClient);

// Allzy Market seller registration
const sellerForm = document.getElementById("seller-registration-form");

if (sellerForm) {
  sellerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("seller-registration-message");
    const button = sellerForm.querySelector('button[type="submit"]');

    const storeName = document.getElementById("seller-store-name").value.trim();
    const phone = document.getElementById("seller-phone").value.trim();
    const address = document.getElementById("seller-address").value.trim();
    const email = document.getElementById("seller-email").value.trim();
    const password = document.getElementById("seller-password").value;

    message.textContent = "Registering your seller account...";
    button.disabled = true;

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            store_name: storeName,
            phone: phone,
            address: address
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        message.textContent = data.session
          ? "Registration successful! Your seller account is pending approval."
          : "Registration received! Check your email to confirm your account. Your seller profile will be pending approval.";
        sellerForm.reset();
      }
    } catch (error) {
      message.textContent = "Registration failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// Allzy Market seller product upload
const sellerProductForm = document.getElementById("seller-product-form");

if (sellerProductForm) {
  sellerProductForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("seller-product-message");
    const button = sellerProductForm.querySelector('button[type="submit"]');

    const name = document.getElementById("product-name").value.trim();
    const price = Number(document.getElementById("product-price").value);
    const category = document.getElementById("product-category").value.trim();
    const description = document.getElementById("product-description").value.trim();
    const imageUrl = document.getElementById("product-image").value.trim();

    if (!name || !category || !description || !imageUrl || price <= 0) {
      message.textContent = "Please complete every field with valid information.";
      return;
    }

    message.textContent = "Checking your seller account...";
    button.disabled = true;

    try {
      const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

      if (userError) throw userError;

      const user = userData.user;

      if (!user) {
        throw new Error("Please log in before adding a product.");
      }

      const { data: seller, error: sellerError } = await supabaseClient
        .from("seller_profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (sellerError) throw sellerError;

      if (seller.status !== "approved") {
        throw new Error("Your seller account must be approved before adding products.");
      }

      const { error: insertError } = await supabaseClient
        .from("products")
        .insert({
          name: name,
          price: price,
          category: category,
          description: description,
          image_url: imageUrl,
          seller_id: user.id,
          is_available: true
        });

      if (insertError) throw insertError;

      message.textContent = "Product added successfully!";
      sellerProductForm.reset();
    } catch (error) {
      console.error("Seller product upload error:", error);
      message.textContent = "Could not add product: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// Allzy Market seller login and logout
const sellerLoginForm = document.getElementById("seller-login-form");
const sellerLogoutButton = document.getElementById("seller-logout-button");

async function updateSellerLoginStatus() {
  const message = document.getElementById("seller-login-message");
  const productSection = document.getElementById("seller-products");

  if (!message || !productSection) return;

  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) throw error;

    if (!data.user) {
      message.textContent = "Please log in with your seller account.";
      if (sellerLogoutButton) sellerLogoutButton.hidden = true;
      productSection.hidden = true;
      return;
    }

    const { data: seller, error: sellerError } = await supabaseClient
      .from("seller_profiles")
      .select("store_name, status")
      .eq("id", data.user.id)
      .single();

    if (sellerError) throw sellerError;

    if (sellerLoginForm) sellerLoginForm.hidden = true;
    if (sellerLogoutButton) sellerLogoutButton.hidden = false;

    if (seller.status === "approved") {
      message.textContent = "Welcome, " + seller.store_name + "! Your seller account is approved.";
      productSection.hidden = false;
    } else {
      message.textContent = "Your seller account is pending approval.";
      productSection.hidden = true;
    }
  } catch (error) {
    console.error("Seller status error:", error);
    message.textContent = "Could not check seller status. Please refresh and try again.";
    productSection.hidden = true;
  }
}

if (sellerLoginForm) {
  sellerLoginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("seller-login-message");
    const button = sellerLoginForm.querySelector('button[type="submit"]');

    const email = document.getElementById("seller-login-email").value.trim();
    const password = document.getElementById("seller-login-password").value;

    message.textContent = "Logging in...";
    button.disabled = true;

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      message.textContent = "Login successful. Checking your seller account...";
      await updateSellerLoginStatus();
    } catch (error) {
      message.textContent = "Login failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

if (sellerLogoutButton) {
  sellerLogoutButton.addEventListener("click", async function () {
    const message = document.getElementById("seller-login-message");

    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) throw error;

      if (sellerLoginForm) {
        sellerLoginForm.hidden = false;
        sellerLoginForm.reset();
      }

      message.textContent = "You have logged out.";
      sellerLogoutButton.hidden = true;

      const productSection = document.getElementById("seller-products");
      if (productSection) productSection.hidden = true;
    } catch (error) {
      message.textContent = "Logout failed: " + error.message;
    }
  });
}

if (sellerLoginForm) {
  updateSellerLoginStatus();
}
