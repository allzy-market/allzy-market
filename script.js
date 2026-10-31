
/* =========================================
   ALLZY MARKET - MAIN JAVASCRIPT
========================================= */

/* SUPABASE CONNECTION */

const SUPABASE_URL = "https://xdmuygtrzqznbywvzypl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_UGRcI_2l6Vpl7QroGTVFiw_J818DtOC";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =========================================
   GLOBAL VARIABLES
========================================= */

let products = [];
let cart = [];
let wishlist = JSON.parse(localStorage.getItem("allzyWishlist") || "[]");

let currentSeller = null;
let isMarketplaceAdmin = false;
let customerPasswordRecoveryActive = false;

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2
});

/* =========================================
   HELPER FUNCTIONS
========================================= */

function getElement(id) {
  return document.getElementById(id);
}

function showMessage(id, message, isError = false) {
  const element = getElement(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#c62828" : "#087443";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function safeImageURL(value) {
  try {
    const url = new URL(value, window.location.origin);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (error) {
    console.warn("Invalid product image URL.");
  }

  return "";
}

function formatPrice(value) {
  return naira.format(Number(value) || 0);
}

function setVisible(id, visible) {
  const element = getElement(id);
  if (element) element.hidden = !visible;
}

function getStatusClass(status) {
  return "status-" + String(status || "pending")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

/* =========================================
   WISHLIST
========================================= */

function saveWishlist() {
  localStorage.setItem("allzyWishlist", JSON.stringify(wishlist));
  updateWishlistCount();
}

function updateWishlistCount() {
  const count = getElement("wishlist-count");
  if (count) count.textContent = wishlist.length;
}

function isInWishlist(productId) {
  return wishlist.some(id => String(id) === String(productId));
}

function toggleWishlist(productId) {
  if (isInWishlist(productId)) {
    wishlist = wishlist.filter(id => String(id) !== String(productId));
  } else {
    wishlist.push(productId);
  }

  saveWishlist();
  renderProducts();
  renderWishlist();
}

function renderWishlist() {
  const container = getElement("wishlist-products");
  if (!container) return;

  const savedProducts = products.filter(product =>
    isInWishlist(product.id)
  );

  if (!savedProducts.length) {
    container.innerHTML = "<p>Your wishlist is empty.</p>";
    return;
  }

  container.innerHTML = savedProducts.map(product => {
    const image = safeImageURL(product.image_url);

    return `
      <div class="product">
        ${image ? `<img src="${image}" alt="${escapeHTML(product.name)}">` : ""}
        <h3>${escapeHTML(product.name)}</h3>
        <p class="product-price">${formatPrice(product.price)}</p>
        <button type="button" onclick="addToCart('${escapeHTML(product.id)}')">
          Add to Cart
        </button>
        <button type="button" class="wishlist-button"
          onclick="toggleWishlist('${escapeHTML(product.id)}')">
          Remove from Wishlist
        </button>
      </div>
    `;
  }).join("");
}

/* =========================================
   PRODUCT LOADING
========================================= */

async function loadProducts() {
  const container = getElement("products");

  if (container) {
    container.innerHTML = "<p>Loading products...</p>";
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_available", true);

  if (error) {
    console.error("Product loading error:", error);

    if (container) {
      container.innerHTML = "<p>Unable to load products. Please try again.</p>";
    }
    return;
  }

  products = data || [];

  renderProducts();
  renderWishlist();
}

/* =========================================
   PRODUCT SEARCH, FILTER AND SORT
========================================= */

function getFilteredProducts() {
  const search = (getElement("product-search")?.value || "")
    .trim()
    .toLowerCase();

  const category = (getElement("product-category")?.value || "all")
    .toLowerCase();

  const sort = getElement("product-sort")?.value || "recommended";

  let filtered = products.filter(product => {
    const name = String(product.name || "").toLowerCase();
    const description = String(product.description || "").toLowerCase();
    const productCategory = String(product.category || "").toLowerCase();

    const matchesSearch =
      name.includes(search) ||
      description.includes(search) ||
      productCategory.includes(search);

    const categoryMap = {
      fashion: ["fashion", "clothing", "clothes", "tops"],
      bags: ["bag", "bags"],
      shoes: ["shoe", "shoes", "slippers", "footwear"],
      electronics: [
        "electronics",
        "power bank",
        "phone accessories",
        "headphones",
        "audio",
        "charger"
      ],
      beauty: ["beauty", "skincare", "cosmetics"],
      kids: ["kids", "children", "baby"],
      home: ["home", "living", "household"]
    };

    const matchesCategory =
      category === "all" ||
      (categoryMap[category] || [category]).some(term =>
        productCategory.includes(term)
      );

    return matchesSearch && matchesCategory;
  });

  if (sort === "price-low") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  }

  if (sort === "price-high") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  }

  if (sort === "name") {
    filtered.sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }

  if (sort === "newest") {
    filtered.sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }

  return filtered;
}

/* =========================================
   PRODUCT DISPLAY
========================================= */

function renderProducts() {
  const container = getElement("products");
  if (!container) return;

  const filtered = getFilteredProducts();

  if (!filtered.length) {
    container.innerHTML = "<p>No products found.</p>";
    return;
  }

  container.innerHTML = filtered.map(product => {
    const id = escapeHTML(product.id);
    const name = escapeHTML(product.name);
    const description = escapeHTML(product.description);
    const image = safeImageURL(product.image_url);

    const saved = isInWishlist(product.id);

    return `
      <article class="product">
        ${image
          ? `<img class="product-image"
              src="${image}"
              alt="${name}"
              loading="lazy">`
          : ""}

        <h3 class="product-title">${name}</h3>

        <p class="product-description">${description}</p>

        <p class="product-price">${formatPrice(product.price)}</p>

        <button
          type="button"
          class="wishlist-button"
          onclick="toggleWishlist('${id}')">
          ${saved ? "♥ Saved" : "♡ Add to Wishlist"}
        </button>

        <button
          type="button"
          class="view-product-details"
          onclick="viewProductDetails('${id}')">
          View Details
        </button>

        <button
          type="button"
          class="add-to-cart"
          onclick="addToCart('${id}')">
          Add to Cart
        </button>
      </article>
    `;
  }).join("");
}

function viewProductDetails(productId) {
  const product = products.find(item =>
    String(item.id) === String(productId)
  );

  if (!product) return;

  const container = getElement("product-details-content");
  if (!container) return;

  const image = safeImageURL(product.image_url);

  container.innerHTML = `
    ${image
      ? `<img src="${image}" alt="${escapeHTML(product.name)}"
          style="width:100%;max-height:300px;object-fit:contain;">`
      : ""}

    <h2>${escapeHTML(product.name)}</h2>

    <p>${escapeHTML(product.description)}</p>

    <h3>${formatPrice(product.price)}</h3>

    <p>Delivery fee is calculated separately.</p>

    <button type="button"
      onclick="addToCart('${escapeHTML(product.id)}')">
      Add to Cart
    </button>
  `;

  setVisible("product-details", true);

  getElement("product-details").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* =========================================
   SHOPPING CART
========================================= */

function addToCart(productId) {
  const product = products.find(item =>
    String(item.id) === String(productId)
  );

  if (!product) return;

  const existing = cart.find(item =>
    String(item.id) === String(product.id)
  );

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1
    });
  }

  renderCart();
  alert("Product added to your cart.");
}

function changeCartQuantity(productId, change) {
  const item = cart.find(product =>
    String(product.id) === String(productId)
  );

  if (!item) return;

  item.quantity += Number(change);

  if (item.quantity <= 0) {
    cart = cart.filter(product =>
      String(product.id) !== String(productId)
    );
  }

  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item =>
    String(item.id) !== String(productId)
  );

  renderCart();
}

function renderCart() {
  const container = getElement("cart-items");
  const totalElement = getElement("cart-total");

  if (!container || !totalElement) return;

  if (!cart.length) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    totalElement.textContent = "Total: ₦0";
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <p><strong>${escapeHTML(item.name)}</strong></p>

      <p>Price: ${formatPrice(item.price)}</p>

      <div class="cart-quantity-controls">
        <button type="button"
          onclick="changeCartQuantity('${escapeHTML(item.id)}', -1)">
          −
        </button>

        <span>${item.quantity}</span>

        <button type="button"
          onclick="changeCartQuantity('${escapeHTML(item.id)}', 1)">
          +
        </button>
      </div>

      <p>Subtotal: ${formatPrice(item.price * item.quantity)}</p>

      <button type="button"
        onclick="removeFromCart('${escapeHTML(item.id)}')">
        Remove
      </button>
    </div>
  `).join("");

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  totalElement.textContent = "Total: " + formatPrice(total);
}

function checkout() {
  if (!cart.length) {
    alert("Your shopping cart is empty.");
    return;
  }

  setVisible("checkout-form", true);

  getElement("checkout-form").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* =========================================
   CUSTOMER CHECKOUT AND ORDER SUBMISSION
========================================= */

async function submitCustomerOrder(event) {
  event.preventDefault();

  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const customerName = getElement("customer-name").value.trim();
  const customerPhone = getElement("customer-phone").value.trim();
  const customerAddress = getElement("customer-address").value.trim();
  const customerCity = getElement("customer-city").value.trim();
  const customerState = getElement("customer-state").value.trim();

  if (
    !customerName ||
    !customerPhone ||
    !customerAddress ||
    !customerCity ||
    !customerState
  ) {
    alert("Please complete all delivery details.");
    return;
  }

  const submitButton = getElement("customer-order-form")
    .querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submitButton.textContent = "Submitting Order...";

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

    if (error) throw error;

    if (!data || !data.success) {
      throw new Error(data?.message || "Order submission failed.");
    }

    const orderId = data.order_id;
    const totalAmount = data.total_amount;

    const confirmation = document.createElement("div");
    confirmation.className = "order-confirmation";

    confirmation.innerHTML = `
      <h2>Order Placed Successfully!</h2>
      <p>Thank you for shopping with Allzy Market.</p>
      <p>Your order number is:</p>
      <p class="order-number">${escapeHTML(orderId)}</p>
      <p>Total: ${formatPrice(totalAmount)}</p>
      <button type="button" id="track-new-order">
        Track My Order
      </button>
    `;

    getElement("checkout-form").prepend(confirmation);

    getElement("track-new-order").addEventListener("click", () => {
      getElement("tracking-order-id").value = orderId;
      getElement("tracking-phone").value = customerPhone;

      getElement("order-tracking").scrollIntoView({
        behavior: "smooth"
      });
    });

    cart = [];
    renderCart();

    getElement("customer-order-form").reset();
    setVisible("checkout-form", false);

  } catch (error) {
    console.error("Order submission error:", error);
    alert(error.message || "Unable to place your order. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Place Order";
  }
}

/* =========================================
   ORDER TRACKING
========================================= */

async function trackOrder(event) {
  event.preventDefault();

  const orderId = getElement("tracking-order-id").value.trim();
  const phone = getElement("tracking-phone").value.trim();
  const result = getElement("tracking-result");

  if (!orderId || !phone) {
    result.textContent = "Please enter your order number and phone number.";
    return;
  }

  result.textContent = "Checking your order...";

  try {
    const response = await fetch(
      SUPABASE_URL + "/functions/v1/track-order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          orderId,
          phone
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error || data.success === false) {
      throw new Error(data.message || data.error || "Order not found.");
    }

    const status = String(
      data.status || data.order_status || "pending"
    ).toLowerCase();

    const steps = [
      "pending",
      "confirmed",
      "shipped",
      "delivered"
    ];

    const currentIndex = steps.indexOf(status);

    const journey = steps.map((step, index) => {
      let className = "";

      if (status === "cancelled") {
        className = "";
      } else if (index < currentIndex) {
        className = "completed";
      } else if (index === currentIndex) {
        className = "current";
      }

      return `
        <div class="tracking-step ${className}">
          <div class="tracking-icon">${index + 1}</div>
          <span>${step.charAt(0).toUpperCase() + step.slice(1)}</span>
        </div>
      `;
    }).join("");

    result.innerHTML = `
      <div class="tracking-journey">
        <h3>Order Status</h3>
        <p>Order: ${escapeHTML(orderId)}</p>
        <p class="order-status ${getStatusClass(status)}">
          ${escapeHTML(status.toUpperCase())}
        </p>
        <div class="tracking-steps">${journey}</div>
        <p class="tracking-status-message">
          ${status === "cancelled"
            ? "This order has been cancelled."
            : "Your order is currently " + escapeHTML(status) + "."}
        </p>
      </div>
    `;

  } catch (error) {
    console.error("Tracking error:", error);
    result.textContent = error.message || "Unable to track this order.";
  }
}

/* =========================================
   CUSTOMER SIGNUP
========================================= */

async function customerSignup(event) {
  event.preventDefault();

  const name = getElement("customer-signup-name").value.trim();
  const email = getElement("customer-signup-email").value.trim();
  const password = getElement("customer-signup-password").value;

  showMessage("customer-account-message", "Creating your account...");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        account_type: "customer"
      }
    }
  });

  if (error) {
    showMessage("customer-account-message", error.message, true);
    return;
  }

  if (data.session) {
    showMessage("customer-account-message", "Account created successfully.");
    updateCustomerAccountStatus(data.session.user);
  } else {
    showMessage(
      "customer-account-message",
      "Account created. Please confirm your email before logging in."
    );
  }
}

/* =========================================
   CUSTOMER LOGIN
========================================= */

async function customerLogin(event) {
  event.preventDefault();

  const email = getElement("customer-login-email").value.trim();
  const password = getElement("customer-login-password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("customer-account-message", error.message, true);
    return;
  }

  if (data.user?.user_metadata?.account_type !== "customer") {
    showMessage(
      "customer-account-message",
      "This account is not registered as a customer account.",
      true
    );
    return;
  }

  showMessage("customer-account-message", "Welcome back!");
  updateCustomerAccountStatus(data.user);
}

/* =========================================
   CUSTOMER ACCOUNT DISPLAY
========================================= */

async function updateCustomerAccountStatus(user = null) {
  if (customerPasswordRecoveryActive) return;

  if (!user) {
    const { data } = await supabaseClient.auth.getUser();
    user = data.user;
  }

  if (!user || user.user_metadata?.account_type !== "customer") {
    setVisible("customer-dashboard", false);
    return;
  }

  setVisible("customer-signup-form", false);
  setVisible("customer-login-form", false);
  setVisible("customer-forgot-password-form", false);
  setVisible("customer-reset-password-form", false);
  setVisible("customer-dashboard", true);

  getElement("customer-dashboard-name").textContent =
    user.user_metadata?.full_name || "Customer";

  getElement("customer-dashboard-email").textContent =
    user.email || "";
}

/* =========================================
   CUSTOMER LOGOUT
========================================= */

async function customerLogout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showMessage("customer-account-message", error.message, true);
    return;
  }

  setVisible("customer-dashboard", false);
  setVisible("customer-signup-form", true);
  setVisible("customer-login-form", true);
  setVisible("customer-forgot-password-form", true);

  showMessage("customer-account-message", "You have logged out.");
}

/* =========================================
   PASSWORD RECOVERY
========================================= */

async function customerForgotPassword(event) {
  event.preventDefault();

  const email = getElement("customer-recovery-email").value.trim();

  const { error } = await supabaseClient.auth.resetPasswordForEmail(
    email,
    {
      redirectTo:
        window.location.origin + window.location.pathname
    }
  );

  if (error) {
    showMessage("customer-account-message", error.message, true);
    return;
  }

  showMessage(
    "customer-account-message",
    "Password reset instructions have been sent to your email."
  );
}

async function customerResetPassword(event) {
  event.preventDefault();

  const password = getElement("customer-new-password").value;

  const { error } = await supabaseClient.auth.updateUser({
    password
  });

  if (error) {
    showMessage("customer-account-message", error.message, true);
    return;
  }

  customerPasswordRecoveryActive = false;

  setVisible("customer-reset-password-form", false);
  setVisible("customer-forgot-password-form", true);

  getElement("customer-reset-password-form").reset();

  showMessage(
    "customer-account-message",
    "Your password has been updated successfully. You can now log in."
  );

  await updateCustomerAccountStatus();
}

/* =========================================
   SELLER REGISTRATION
========================================= */

async function sellerRegistration(event) {
  event.preventDefault();

  const storeName = getElement("seller-store-name").value.trim();
  const phone = getElement("seller-phone").value.trim();
  const address = getElement("seller-address").value.trim();
  const email = getElement("seller-email").value.trim();
  const password = getElement("seller-password").value;

  showMessage(
    "seller-registration-message",
    "Submitting your seller registration..."
  );

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        store_name: storeName,
        phone,
        address
      }
    }
  });

  if (error) {
    showMessage("seller-registration-message", error.message, true);
    return;
  }

  if (data.session) {
    const { error: applicationError } =
      await supabaseClient.rpc("submit_seller_application");

    if (applicationError) {
      showMessage(
        "seller-registration-message",
        applicationError.message,
        true
      );
      return;
    }

    showMessage(
      "seller-registration-message",
      "Registration submitted. Please wait for admin approval."
    );
  } else {
    showMessage(
      "seller-registration-message",
      "Please confirm your email, then log in to complete your seller application."
    );
  }
}

/* =========================================
   SELLER LOGIN
========================================= */

async function sellerLogin(event) {
  event.preventDefault();

  const email = getElement("seller-login-email").value.trim();
  const password = getElement("seller-login-password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("seller-login-message", error.message, true);
    return;
  }

  await supabaseClient.rpc("submit_seller_application");

  await updateSellerLoginStatus(data.user);
}

/* =========================================
   SELLER STATUS AND DASHBOARD
========================================= */

async function updateSellerLoginStatus(user = null) {
  if (!user) {
    const { data } = await supabaseClient.auth.getUser();
    user = data.user;
  }

  currentSeller = null;

  if (!user) {
    setVisible("seller-products", false);
    setVisible("seller-inventory-section", false);
    setVisible("seller-orders-section", false);
    setVisible("seller-logout-button", false);
    return;
  }

  const { data: seller, error } = await supabaseClient
    .from("seller_profiles")
    .select("id, store_name, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Seller status error:", error);
    return;
  }

  if (!seller) {
    setVisible("seller-products", false);
    setVisible("seller-inventory-section", false);
    setVisible("seller-orders-section", false);
    setVisible("seller-logout-button", false);
    return;
  }

  currentSeller = seller;
  setVisible("seller-logout-button", true);

  if (seller.status === "approved") {
    setVisible("seller-products", true);
    setVisible("seller-inventory-section", true);
    setVisible("seller-orders-section", true);
    setVisible("seller-login-form", false);

    showMessage(
      "seller-login-message",
      "Welcome, " + seller.store_name + "! Your seller account is approved."
    );

    loadSellerInventory();
    loadSellerOrders();

  } else {
    setVisible("seller-products", false);
    setVisible("seller-inventory-section", false);
    setVisible("seller-orders-section", false);

    showMessage(
      "seller-login-message",
      "Your seller application is " +
      (seller.status || "pending") +
      ". Please wait for approval."
    );
  }
}

/* =========================================
   SELLER LOGOUT
========================================= */

async function sellerLogout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showMessage("seller-login-message", error.message, true);
    return;
  }

  currentSeller = null;

  setVisible("seller-products", false);
  setVisible("seller-inventory-section", false);
  setVisible("seller-orders-section", false);
  setVisible("seller-logout-button", false);
  setVisible("seller-login-form", true);

  showMessage("seller-login-message", "Seller logged out.");
}

/* =========================================
   SELLER PRODUCT UPLOAD
========================================= */

async function uploadSellerProduct(event) {
  event.preventDefault();

  const { data: authData } = await supabaseClient.auth.getUser();
  const user = authData.user;

  if (!user) {
    showMessage("seller-product-message", "Please log in first.", true);
    return;
  }

  const { data: seller } = await supabaseClient
    .from("seller_profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (!seller || seller.status !== "approved") {
    showMessage(
      "seller-product-message",
      "Only approved sellers can upload products.",
      true
    );
    return;
  }

  const name = getElement("product-name").value.trim();
  const price = Number(getElement("product-price").value);
  const category = getElement("seller-product-category").value;
  const description = getElement("product-description").value.trim();
  const file = getElement("product-image").files[0];

  if (!name || !price || price <= 0 || !category || !description || !file) {
    showMessage(
      "seller-product-message",
      "Please complete all product details.",
      true
    );
    return;
  }

  if (!file.type.startsWith("image/")) {
    showMessage(
      "seller-product-message",
      "Please select a valid image.",
      true
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage(
      "seller-product-message",
      "Image size must not exceed 5MB.",
      true
    );
    return;
  }

  showMessage("seller-product-message", "Uploading product...");

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const imagePath = `${user.id}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("product-images")
    .upload(imagePath, file);

  if (uploadError) {
    showMessage("seller-product-message", uploadError.message, true);
    return;
  }

  const { data: publicURL } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(imagePath);

  const { error: insertError } = await supabaseClient
    .from("products")
    .insert({
      name,
      price,
      category,
      description,
      image_url: publicURL.publicUrl,
      seller_id: user.id,
      is_available: true
    });

  if (insertError) {
    showMessage("seller-product-message", insertError.message, true);
    return;
  }

  getElement("seller-product-form").reset();

  showMessage(
    "seller-product-message",
    "Product uploaded successfully."
  );

  await loadProducts();
  await loadSellerInventory();
}

/* =========================================
   SELLER INVENTORY
========================================= */

async function loadSellerInventory() {
  const container = getElement("seller-inventory-list");
  if (!container) return;

  const { data: authData } = await supabaseClient.auth.getUser();

  if (!authData.user) return;

  container.textContent = "Loading your products...";

  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, price, category, description, image_url, is_available")
    .eq("seller_id", authData.user.id)
    .order("name");

  if (error) {
    showMessage("seller-inventory-message", error.message, true);
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = "<p>You have not uploaded any products yet.</p>";
    return;
  }

  container.innerHTML = data.map(product => {
    const id = escapeHTML(product.id);
    const image = safeImageURL(product.image_url);

    return `
      <div class="seller-inventory-item">
        ${image
          ? `<img src="${image}" alt="${escapeHTML(product.name)}"
              style="width:100%;max-width:140px;height:100px;object-fit:contain;">`
          : ""}

        <h3>${escapeHTML(product.name)}</h3>

        <p>Price: ${formatPrice(product.price)}</p>

        <p>Category: ${escapeHTML(product.category)}</p>

        <p>Status: ${product.is_available ? "Available" : "Unavailable"}</p>

        <button type="button"
          onclick="toggleProductAvailability('${id}', ${!product.is_available})">
          ${product.is_available ? "Hide Product" : "Make Available"}
        </button>
      </div>
    `;
  }).join("");
}

async function toggleProductAvailability(productId, available) {
  const { data: authData } = await supabaseClient.auth.getUser();

  if (!authData.user) return;

  const { error } = await supabaseClient
    .from("products")
    .update({ is_available: available })
    .eq("id", productId)
    .eq("seller_id", authData.user.id);

  if (error) {
    showMessage("seller-inventory-message", error.message, true);
    return;
  }

  showMessage(
    "seller-inventory-message",
    "Product availability updated."
  );

  await loadSellerInventory();
  await loadProducts();
}

/* =========================================
   SELLER ORDERS
========================================= */

async function loadSellerOrders() {
  const container = getElement("seller-orders-list");
  if (!container) return;

  container.textContent = "Loading your orders...";

  const { data, error } = await supabaseClient.rpc(
    "get_my_seller_orders"
  );

  if (error) {
    showMessage("seller-orders-message", error.message, true);
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = "<p>You have no orders yet.</p>";
    return;
  }

  container.innerHTML = data.map(order => `
    <div class="cart-section">
      <h3>Order #${escapeHTML(order.order_id)}</h3>

      <p>Product: ${escapeHTML(order.product_name)}</p>

      <p>Quantity: ${Number(order.quantity)}</p>

      <p>Unit Price: ${formatPrice(order.unit_price)}</p>

      <p>Date: ${escapeHTML(order.order_date || "")}</p>

      <p>
        Status:
        <span class="order-status ${getStatusClass(order.order_status)}">
          ${escapeHTML(String(order.order_status || "").toUpperCase())}
        </span>
      </p>
    </div>
  `).join("");
}

/* =========================================
   ADMIN LOGIN
========================================= */

async function adminLogin(event) {
  event.preventDefault();

  const email = getElement("admin-email").value.trim();
  const password = getElement("admin-password").value;

  showMessage("admin-message", "Checking admin account...");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("admin-message", error.message, true);
    return;
  }

  const { data: isAdmin, error: adminError } =
    await supabaseClient.rpc("is_marketplace_admin");

  if (adminError || isAdmin !== true) {
    await supabaseClient.auth.signOut();

    showMessage(
      "admin-message",
      "This account does not have administrator access.",
      true
    );
    return;
  }

  isMarketplaceAdmin = true;

  setVisible("admin-login-form", false);
  setVisible("admin-logout-button", true);
  setVisible("admin-orders-section", true);
  setVisible("seller-approval-section", true);

  showMessage("admin-message", "Admin login successful.");

  await loadAdminOrders();
  await loadSellerApplications();
}

/* =========================================
   ADMIN ORDER MANAGEMENT
========================================= */

async function loadAdminOrders() {
  if (!isMarketplaceAdmin) return;

  const container = getElement("admin-orders-list");
  if (!container) return;

  container.textContent = "Loading marketplace orders...";

  const { data: orders, error } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.textContent = error.message;
    return;
  }

  if (!orders || !orders.length) {
    container.innerHTML = "<p>No orders have been placed yet.</p>";
    return;
  }

  const { data: orderItems, error: itemsError } = await supabaseClient
    .from("order_items")
    .select("*");

  if (itemsError) {
    container.textContent = itemsError.message;
    return;
  }

  container.innerHTML = orders.map(order => {
    const relatedItems = (orderItems || []).filter(item =>
      String(item.order_id) === String(order.id)
    );

    const itemsHTML = relatedItems.map(item => `
      <p>
        Product: ${escapeHTML(item.product_name || item.name || "Product")}
        | Quantity: ${Number(item.quantity || 0)}
      </p>
    `).join("");

    const statuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled"
    ];

    return `
      <div class="cart-section">
        <h3>Order #${escapeHTML(order.id)}</h3>

        <p>Customer: ${escapeHTML(order.customer_name || "")}</p>

        <p>Phone: ${escapeHTML(order.customer_phone || "")}</p>

        <p>Address: ${escapeHTML(order.delivery_address || "")}</p>

        <p>Total: ${formatPrice(order.total_amount)}</p>

        <p>Date: ${escapeHTML(order.created_at || "")}</p>

        ${itemsHTML}

        <p>
          Status:
          <span class="order-status ${getStatusClass(order.status)}">
            ${escapeHTML(String(order.status || "").toUpperCase())}
          </span>
        </p>

        <label for="status-${escapeHTML(order.id)}">Update Status</label>

        <select id="status-${escapeHTML(order.id)}">
          ${statuses.map(status => `
            <option value="${status}"
              ${order.status === status ? "selected" : ""}>
              ${status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          `).join("")}
        </select>

        <button type="button"
          onclick="updateAdminOrderStatus('${escapeHTML(order.id)}')">
          Update Order
        </button>
      </div>
    `;
  }).join("");
}

async function updateAdminOrderStatus(orderId) {
  if (!isMarketplaceAdmin) return;

  const select = getElement("status-" + orderId);
  if (!select) return;

  const newStatus = select.value;

  const { data, error } = await supabaseClient.rpc(
    "admin_update_order_status",
    {
      p_order_id: orderId,
      p_new_status: newStatus
    }
  );

  if (error || data !== true) {
    showMessage(
      "admin-message",
      error?.message || "Unable to update order status.",
      true
    );
    return;
  }

  showMessage("admin-message", "Order status updated successfully.");

  await loadAdminOrders();
}

/* =========================================
   SELLER APPLICATION APPROVAL
========================================= */

async function loadSellerApplications() {
  if (!isMarketplaceAdmin) return;

  const container = getElement("seller-applications-list");
  if (!container) return;

  container.textContent = "Loading seller applications...";

  const { data, error } = await supabaseClient
    .from("seller_applications")
    .select("*")
    .order("applied_at", { ascending: false });

  if (error) {
    showMessage("seller-applications-message", error.message, true);
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = "<p>No seller applications found.</p>";
    return;
  }

  container.innerHTML = data.map(application => `
    <div class="cart-section">
      <h3>${escapeHTML(application.store_name || "Seller Application")}</h3>

      <p>Email: ${escapeHTML(application.email || "")}</p>

      <p>Phone: ${escapeHTML(application.phone || "")}</p>

      <p>Address: ${escapeHTML(application.address || "")}</p>

      <p>Status: ${escapeHTML(application.status || "pending")}</p>

      <button type="button"
        onclick="reviewSellerApplication('${escapeHTML(application.id)}', 'approved')">
        Approve
      </button>

      <button type="button"
        onclick="reviewSellerApplication('${escapeHTML(application.id)}', 'rejected')">
        Reject
      </button>
    </div>
  `).join("");
}

async function reviewSellerApplication(applicationId, newStatus) {
  if (!isMarketplaceAdmin) return;

  const { data, error } = await supabaseClient.rpc(
    "admin_review_seller",
    {
      p_application_id: applicationId,
      p_new_status: newStatus
    }
  );

  if (error || data !== true) {
    showMessage(
      "seller-applications-message",
      error?.message || "Unable to review application.",
      true
    );
    return;
  }

  showMessage(
    "seller-applications-message",
    "Seller application " + newStatus + "."
  );

  await loadSellerApplications();
}

/* =========================================
   ADMIN LOGOUT
========================================= */

async function adminLogout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showMessage("admin-message", error.message, true);
    return;
  }

  isMarketplaceAdmin = false;

  setVisible("admin-login-form", true);
  setVisible("admin-logout-button", false);
  setVisible("admin-orders-section", false);
  setVisible("seller-approval-section", false);

  showMessage("admin-message", "Admin logged out.");
}

/* =========================================
   AUTHENTICATION STATE
========================================= */

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    customerPasswordRecoveryActive = true;

    setVisible("customer-signup-form", false);
    setVisible("customer-login-form", false);
    setVisible("customer-forgot-password-form", false);
    setVisible("customer-dashboard", false);
    setVisible("customer-reset-password-form", true);

    showMessage(
      "customer-account-message",
      "Enter your new password below."
    );

    return;
  }

  if (event === "SIGNED_OUT") {
    currentSeller = null;
    isMarketplaceAdmin = false;

    setVisible("seller-products", false);
    setVisible("seller-inventory-section", false);
    setVisible("seller-orders-section", false);
    setVisible("seller-logout-button", false);

    setVisible("admin-orders-section", false);
    setVisible("seller-approval-section", false);
    setVisible("admin-logout-button", false);
    setVisible("admin-login-form", true);

    setVisible("customer-dashboard", false);

    if (!customerPasswordRecoveryActive) {
      setVisible("customer-signup-form", true);
      setVisible("customer-login-form", true);
      setVisible("customer-forgot-password-form", true);
    }
  }
});

/* =========================================
   EVENT LISTENERS
========================================= */

function initializeMarketplace() {

  /* Customer account */

  getElement("customer-signup-form")
    ?.addEventListener("submit", customerSignup);

  getElement("customer-login-form")
    ?.addEventListener("submit", customerLogin);

  getElement("customer-forgot-password-form")
    ?.addEventListener("submit", customerForgotPassword);

  getElement("customer-reset-password-form")
    ?.addEventListener("submit", customerResetPassword);

  getElement("customer-logout-button")
    ?.addEventListener("click", customerLogout);

  /* Product search and filters */

  getElement("product-search")
    ?.addEventListener("input", renderProducts);

  getElement("product-category")
    ?.addEventListener("change", renderProducts);

  getElement("product-sort")
    ?.addEventListener("change", renderProducts);

  /* Wishlist */

  getElement("wishlist-toggle")
    ?.addEventListener("click", () => {
      const section = getElement("wishlist-section");
      setVisible("wishlist-section", section.hidden);

      if (!section.hidden) {
        renderWishlist();
      }
    });

  /* Product details */

  getElement("close-product-details")
    ?.addEventListener("click", () => {
      setVisible("product-details", false);
    });

  /* Checkout */

  getElement("checkout-button")
    ?.addEventListener("click", checkout);

  getElement("customer-order-form")
    ?.addEventListener("submit", submitCustomerOrder);

  /* Order tracking */

  getElement("track-order-form")
    ?.addEventListener("submit", trackOrder);

  /* Seller */

  getElement("seller-registration-form")
    ?.addEventListener("submit", sellerRegistration);

  getElement("seller-login-form")
    ?.addEventListener("submit", sellerLogin);

  getElement("seller-logout-button")
    ?.addEventListener("click", sellerLogout);

  getElement("seller-product-form")
    ?.addEventListener("submit", uploadSellerProduct);

  getElement("seller-refresh-orders")
    ?.addEventListener("click", loadSellerOrders);

  getElement("refresh-seller-inventory")
    ?.addEventListener("click", loadSellerInventory);

  /* Admin */

  getElement("admin-login-form")
    ?.addEventListener("submit", adminLogin);

  getElement("admin-logout-button")
    ?.addEventListener("click", adminLogout);

  getElement("admin-refresh-orders")
    ?.addEventListener("click", loadAdminOrders);

  getElement("refresh-seller-applications")
    ?.addEventListener("click", loadSellerApplications);

  /* Footer year */

  const year = getElement("current-year");
  if (year) year.textContent = new Date().getFullYear();

  /* Initial product and account loading */

  updateWishlistCount();
  renderCart();
  loadProducts();

  supabaseClient.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error("Session loading error:", error);
      return;
    }

    const user = data.session?.user;

    if (!user) return;

    if (user.user_metadata?.account_type === "customer") {
      await updateCustomerAccountStatus(user);
    }

    await updateSellerLoginStatus(user);
  });
}

/* =========================================
   START MARKETPLACE
========================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMarketplace);
} else {
  initializeMarketplace();
}

/* Expose functions used by product and cart buttons */

window.addToCart = addToCart;
window.changeCartQuantity = changeCartQuantity;
window.removeFromCart = removeFromCart;
window.toggleWishlist = toggleWishlist;
window.viewProductDetails = viewProductDetails;
window.checkout = checkout;
window.toggleProductAvailability = toggleProductAvailability;
window.updateAdminOrderStatus = updateAdminOrderStatus;
window.reviewSellerApplication = reviewSellerApplication;
