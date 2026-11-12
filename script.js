
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
const productVariantsCache = new Map();
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
    .eq("is_available", true)
    .eq("status", "active");

  if (error) {
    console.error("Product loading error:", error);

    if (container) {
      container.innerHTML =
        "<p>Unable to load products. Please try again.</p>";
    }

    return;
  }

  // Keep active products visible.
  // Stock availability will be checked when customers select a product.
  products = data || [];

  renderProducts();
  renderWishlist();
}
/* =========================================
   LOAD CUSTOMER PRODUCT VARIANTS
========================================= */

async function loadProductVariants(productId) {
  const cacheKey = String(productId);

  if (productVariantsCache.has(cacheKey)) {
    return productVariantsCache.get(cacheKey);
  }

  const { data, error } = await supabaseClient
    .from("product_variants")
    .select(`
      id,
      product_id,
      size,
      color,
      sku,
      price_override,
      stock_quantity,
      is_available
    `)
    .eq("product_id", productId)
    .eq("is_available", true);

  if (error) {
    console.error("Product variants loading error:", error);
    throw error;
  }

  const variants = data || [];

  productVariantsCache.set(cacheKey, variants);

  return variants;
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

async function viewProductDetails(productId) {
  const product = products.find(
    item => String(item.id) === String(productId)
  );

  if (!product) {
    showMessage("Product not found.");
    return;
  }

  const container = getElement("product-details-content");

  if (!container) {
    showMessage("Product details could not be opened.");
    return;
  }

  container.innerHTML = "<p>Loading product details...</p>";

  const detailsSection = getElement("product-details");

  if (detailsSection) {
    detailsSection.hidden = false;
    detailsSection.scrollIntoView({ behavior: "smooth" });
  }

  let variants = [];

  try {
    variants = await loadProductVariants(product.id);
  } catch (error) {
    console.error("Unable to load product variants:", error);
    container.innerHTML =
      "<p>Unable to load product options. Please try again.</p>";
    return;
  }
console.log("PRODUCT ID:", product.id);
console.log("VARIANTS RECEIVED:", variants);
console.log("VARIANT COUNT:", variants.length);
  const variantOptions = variants.map(variant => {
    const labels = [
      variant.size,
      variant.color
    ].filter(Boolean);

    const optionName = labels.length
      ? labels.join(" / ")
      : "Available option";

    const variantPrice =
      variant.price_override !== null &&
      variant.price_override !== undefined
        ? Number(variant.price_override)
        : Number(product.price);

    return `
      <option value="${escapeHTML(String(variant.id))}">
        ${escapeHTML(optionName)} — ${formatPrice(variantPrice)}
      </option>
    `;
  }).join("");
console.log("GENERATED VARIANT OPTIONS:", variantOptions);
console.log("FIRST VARIANT:", variants[0]);
console.log("OPTIONS HTML:", variantOptions);
   container.innerHTML = `
    <img
      src="${safeImageURL(product.image_url)}"
      alt="${escapeHTML(product.name)}"
    >

    <h2>${escapeHTML(product.name)}</h2>

    <p>${escapeHTML(product.description || "")}</p>

    <h3>${formatPrice(Number(product.price))}</h3>

    <p>Delivery fee is separate.</p>
<p style="color:red;">
  DEBUG: ${variants.length} variants received
</p>
    ${
      variants.length > 0
        ? `
          <label for="product-variant-select">
            Choose size or colour:
          </label>

          <select id="product-variant-select" required>
            <option value="">Select an option</option>
            ${variantOptions}
          </select>
        `
        : "<p>No additional options available.</p>"
    }

    <button
      type="button"
      onclick="addToCart(
        '${escapeHTML(String(product.id))}',
        ${
          variants.length > 0
            ? "document.getElementById('product-variant-select').value"
            : "null"
        }
      )"
    >
      ADD TO CART
    </button>
  `;
}


/* =========================================
   SHOPPING CART
========================================= */

function checkout() {
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const checkoutSection = getElement("checkout-form");

  if (!checkoutSection) {
    alert("Checkout is currently unavailable. Please try again.");
    return;
  }

  setVisible("checkout-form", true);

  checkoutSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


async function addToCart(productId, variantId = null) {
  const product = products.find(item =>
    String(item.id) === String(productId)
  );

  if (!product) {
    alert("Product not found.");
    return;
  }

  let variants = [];

  try {
    variants = await loadProductVariants(product.id);
  } catch (error) {
    alert("Unable to check product options. Please try again.");
    return;
  }

  let selectedVariant = null;

  if (variants.length > 0) {
    if (!variantId) {
      alert("Please select a size or colour in View Details first.");
      await viewProductDetails(product.id);
      return;
    }

    selectedVariant = variants.find(variant =>
      String(variant.id) === String(variantId)
    );

    if (!selectedVariant) {
      alert("Please select a valid product option.");
      return;
    }

    if (Number(selectedVariant.stock_quantity) <= 0) {
      alert("Sorry, this option is out of stock.");
      return;
    }
  }

  const price =
    selectedVariant?.price_override !== null &&
    selectedVariant?.price_override !== undefined
      ? Number(selectedVariant.price_override)
      : Number(product.price);

  const cartKey = selectedVariant
    ? `${product.id}::${selectedVariant.id}`
    : `${product.id}::none`;

  const existing = cart.find(item => item.cartKey === cartKey);

  if (existing) {
    if (
      selectedVariant &&
      existing.quantity >= Number(selectedVariant.stock_quantity)
    ) {
      alert("You have reached the available stock for this option.");
      return;
    }

    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      cartKey,
      name: product.name,
      size: selectedVariant?.size || null,
      color: selectedVariant?.color || null,
      price,
      stock_quantity: selectedVariant
        ? Number(selectedVariant.stock_quantity)
        : null,
      quantity: 1
    });
  }

  renderCart();
  alert("Product added to your cart.");
}

/* =========================================
   CART QUANTITY, REMOVE AND DISPLAY
========================================= */

function changeCartQuantity(cartKey, change) {
  const item = cart.find(product =>
    product.cartKey === cartKey
  );

  if (!item) return;

  if (
    Number(change) > 0 &&
    item.stock_quantity !== null &&
    item.quantity >= Number(item.stock_quantity)
  ) {
    alert("You have reached the available stock for this option.");
    return;
  }

  item.quantity += Number(change);

  if (item.quantity <= 0) {
    cart = cart.filter(product =>
      product.cartKey !== cartKey
    );
  }

  renderCart();
}


function removeFromCart(cartKey) {
  cart = cart.filter(item =>
    item.cartKey !== cartKey
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

  container.innerHTML = cart.map(item => {
    const option = [
      item.size,
      item.color
    ].filter(Boolean).join(" / ");

    return `
      <div class="cart-item">

        <p><strong>${escapeHTML(item.name)}</strong></p>

        ${option
          ? `<p>Option: ${escapeHTML(option)}</p>`
          : ""}

        <p>Price: ${formatPrice(item.price)}</p>

        <div class="cart-quantity-controls">

          <button
            type="button"
            onclick="changeCartQuantity('${escapeHTML(item.cartKey)}', -1)">
            −
          </button>

          <span>${item.quantity}</span>

          <button
            type="button"
            onclick="changeCartQuantity('${escapeHTML(item.cartKey)}', 1)">
            +
          </button>

        </div>

        <p>
          Subtotal:
          ${formatPrice(item.price * item.quantity)}
        </p>

        <button
          type="button"
          onclick="removeFromCart('${escapeHTML(item.cartKey)}')">
          Remove
        </button>

      </div>
    `;
  }).join("");

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  totalElement.textContent = "Total: " + formatPrice(total);
}

/* =========================================
   CUSTOMER CHECKOUT AND ORDER SUBMISSION
========================================= */
async function loadCheckoutAddresses() {
   function fillCheckoutAddress(address) {
  if (!address) return;

  getElement("customer-name").value =
    address.full_name || "";

  getElement("customer-phone").value =
    address.phone || "";

  getElement("customer-address").value = [
    address.address_line,
    address.postal_code,
    address.country
  ].filter(Boolean).join(", ");

  getElement("customer-city").value =
    address.city || "";

getElement("customer-state").value =
address.state || "";
 async function loadCheckoutAddresses() {
}
  const addressSection = getElement("checkout-saved-addresses");
  const addressSelect = getElement("checkout-address-select");

  if (!addressSection || !addressSelect) return;

  const { data: { user } } =
    await supabaseClient.auth.getUser();

  if (!user || user.user_metadata?.account_type !== "customer") {
    addressSection.hidden = true;
    return;
  }

  const { data, error } = await supabaseClient
    .from("customer_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Checkout address loading error:", error);
    showMessage(
      "checkout-address-message",
      "Unable to load saved addresses.",
      true
    );
    return;
  }

  addressSelect.innerHTML =
    '<option value="">Select a delivery address</option>';

  (data || []).forEach(address => {
    const option = document.createElement("option");

    option.value = address.id;

    option.textContent =
      `${address.full_name} - ${address.address_line}, ` +
      `${address.city}, ${address.state}` +
      (address.is_default ? " (Default)" : "");

    addressSelect.appendChild(option);
  });

  addressSection.hidden = false;

  const defaultAddress = (data || []).find(
    address => address.is_default
  );

  if (defaultAddress) {
    addressSelect.value = String(defaultAddress.id);
    fillCheckoutAddress(defaultAddress);
  }
}
async function submitCustomerOrder(event) {
  event.preventDefault();

  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const customerName = getElement("customer-name")?.value.trim();
  const customerPhone = getElement("customer-phone")?.value.trim();
  const customerAddress = getElement("customer-address")?.value.trim();
  const customerCity = getElement("customer-city")?.value.trim();
  const customerState = getElement("customer-state")?.value.trim();

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

  const customerForm = getElement("customer-order-form");

  if (!customerForm) {
    alert("Checkout form is unavailable.");
    return;
  }

  const submitButton = customerForm.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting Order...";
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "submit-order",
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY
        },
        body: {
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: customerAddress,
          delivery_city: customerCity,
          delivery_state: customerState,
          items: cart.map(item => ({
          product_id: item.product_id || item.id,
          variant_id: item.variant_id || null,
          quantity: item.quantity
          }))
        }
      }
    );

    if (error) throw error;

    if (!data || !data.success) {
      throw new Error(
        data?.message || "Order submission failed."
      );
    }

    const orderId = data.order_id;
    const totalAmount = data.total_amount;

    const checkoutSection = getElement("checkout-form");

    if (!checkoutSection) {
      throw new Error("Order confirmation section is unavailable.");
    }

    const oldConfirmation = checkoutSection.querySelector(
      ".order-confirmation"
    );

    if (oldConfirmation) {
      oldConfirmation.remove();
    }

    const confirmation = document.createElement("div");
    confirmation.className = "order-confirmation";

    confirmation.innerHTML = `
      <h2>Order Placed Successfully!</h2>
      <p>Thank you for shopping with Allzy Market.</p>
      <p>Your order number is:</p>
      <p class="order-number">${escapeHTML(String(orderId))}</p>
      <p>Total: ${formatPrice(totalAmount)}</p>
      <button type="button" id="track-new-order">
        Track My Order
      </button>
    `;

    checkoutSection.prepend(confirmation);

    getElement("track-new-order").addEventListener("click", () => {
      const orderIdInput = getElement("tracking-order-id");
      const phoneInput = getElement("tracking-phone");
      const trackingSection = getElement("order-tracking");

      if (orderIdInput) orderIdInput.value = orderId;
      if (phoneInput) phoneInput.value = customerPhone;

      if (trackingSection) {
        trackingSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });

    cart = [];
    renderCart();

    customerForm.reset();

    setVisible("checkout-form", true);

    confirmation.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("Order submission error:", error);

    alert(
      error.message ||
      "Unable to place your order. Please try again."
    );

  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Place Order";
    }
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
    result.textContent =
      "Please enter your order number and phone number.";
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
      throw new Error(
        data.message || data.error || "Order not found."
      );
    }

    const steps = [
      "pending",
      "confirmed",
      "shipped",
      "delivered"
    ];

    function createJourney(status) {
      status = String(status || "pending").toLowerCase();

      const currentIndex = steps.indexOf(status);

      return steps.map((step, index) => {
        let className = "";

        if (status !== "cancelled") {
          if (index < currentIndex) {
            className = "completed";
          } else if (index === currentIndex) {
            className = "current";
          }
        }

        return `
          <div class="tracking-step ${className}">
            <div class="tracking-icon">${index + 1}</div>
            <span>${step.charAt(0).toUpperCase() + step.slice(1)}</span>
          </div>
        `;
      }).join("");
    }

    const overallStatus = String(
      data.status || data.order_status || "pending"
    ).toLowerCase();

    const items = Array.isArray(data.items) ? data.items : [];

    const productTracking = items.length
  ? items.map(item => {
      const productName = escapeHTML(
        item.productName || "Product"
      );

      const quantity = Number(item.quantity) || 0;

      const productStatus = String(
        item.status || "pending"
      ).toLowerCase();

      const variantSize = item.variantSize || item.variant_size || "";
      const variantColor = item.variantColor || item.variant_color || "";

      const variant = [
        variantSize,
        variantColor
      ].filter(Boolean).join(" / ");

      return `
        <div class="product-tracking-item">
          <h4>${productName}</h4>

          ${variant
            ? `<p>Size / Colour: ${escapeHTML(variant)}</p>`
            : ""}

          <p>Quantity: ${quantity}</p>

          <p>
            Product Status:
            <span class="order-status ${getStatusClass(productStatus)}">
              ${escapeHTML(productStatus.toUpperCase())}
            </span>
          </p>

          <div class="tracking-steps">
            ${createJourney(productStatus)}
          </div>

          <p class="tracking-status-message">
            ${productStatus === "cancelled"
              ? "This product has been cancelled."
              : "This product is currently " +
                escapeHTML(productStatus) + "."}
          </p>
        </div>
      `;
    }).join("")
  : "<p>Product tracking details are not available yet.</p>";

    result.innerHTML = `
      <div class="tracking-journey">

        <h3>Order Status</h3>

        <p>Order: ${escapeHTML(orderId)}</p>

        <p class="order-status ${getStatusClass(overallStatus)}">
          ${escapeHTML(overallStatus.toUpperCase())}
        </p>

        <div class="tracking-steps">
          ${createJourney(overallStatus)}
        </div>

        <p class="tracking-status-message">
          Your overall order is currently
          ${escapeHTML(overallStatus)}.
        </p>

        <hr>

        <h3>Track Your Products</h3>

        ${productTracking}

      </div>
    `;

  } catch (error) {
    console.error("Tracking error:", error);

    result.textContent =
      error.message || "Unable to track this order.";
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

  getElement("customer-profile-name").value =
    user.user_metadata?.full_name || "";

  getElement("customer-profile-phone").value =
    user.user_metadata?.phone || "";

  await loadCustomerAddresses();
await loadCustomerOrderHistory();
}

/* CUSTOMER PERSONAL DETAILS */

const customerProfileForm = getElement(
  "customer-personal-details-form"
);

if (customerProfileForm) {
  customerProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = getElement(
      "customer-profile-name"
    ).value.trim();

    const phone = getElement(
      "customer-profile-phone"
    ).value.trim();

    if (!fullName) {
      showMessage(
        "customer-profile-message",
        "Please enter your full name.",
        true
      );
      return;
    }

    const { data, error } = await supabaseClient.auth.updateUser({
      data: {
        full_name: fullName,
        phone: phone
      }
    });

    if (error) {
      console.error("Profile update error:", error);

      showMessage(
        "customer-profile-message",
        "Unable to save your details. Please try again.",
        true
      );
      return;
    }

    getElement("customer-dashboard-name").textContent =
      data.user.user_metadata?.full_name || fullName;

    showMessage(
      "customer-profile-message",
      "Your personal details have been saved successfully."
    );
  });
}
/* =========================================
   CUSTOMER DELIVERY ADDRESS MANAGEMENT
========================================= */

let editingCustomerAddressId = null;

async function loadCustomerAddresses() {
  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) {
  console.error("Address login error:", userError);
  return;
}

console.log("Address user ID:", user.id);

  const { data, error } = await supabaseClient
    .from("customer_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Address loading error:", error);
    showMessage("customer-address-message",
      "Unable to load your addresses.", true);
    return;
  }

  const addressList = getElement("customer-address-list");
  addressList.innerHTML = "";

  if (!data || data.length === 0) {
    addressList.textContent =
      "You have no saved delivery addresses.";
    return;
  }

  data.forEach((address) => {
    const card = document.createElement("div");

    card.innerHTML = `
      <h4>${escapeHTML(address.full_name)}</h4>
      <p>${escapeHTML(address.phone)}</p>
      <p>${escapeHTML(address.address_line)}</p>
      <p>${escapeHTML(address.city)}, ${escapeHTML(address.state)}</p>
      <p>${escapeHTML(address.country)}</p>
      ${address.postal_code
        ? `<p>${escapeHTML(address.postal_code)}</p>`
        : ""}
      ${address.is_default
  ? "<strong>Default Address</strong>"
  : `<button type="button" data-default-address="${address.id}">
       Set as Default
     </button>`}
      <button type="button" data-edit-address="${address.id}">
        Edit Address
      </button>
      <button type="button" data-delete-address="${address.id}">
        Delete Address
      </button>
    `;

    addressList.appendChild(card);
  });
}


/* EDIT AND DELETE ADDRESS BUTTONS */

const customerAddressList = getElement(
  "customer-address-list"
);

if (customerAddressList) {
  customerAddressList.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-address]");
    const deleteButton = event.target.closest("[data-delete-address]");

    const { data: { user }, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !user) return;
const defaultButton = event.target.closest(
  "[data-default-address]"
);

if (defaultButton) {
  const addressId = defaultButton.dataset.defaultAddress;
  
  const { error: resetError } = await supabaseClient
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  if (resetError) {
    showMessage(
      "customer-address-message",
      "Unable to update your default address.",
      true
    );
    return;
  }

  const { error } = await supabaseClient
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Default address error:", error);

    showMessage(
      "customer-address-message",
      "Unable to set this address as default.",
      true
    );
    return;
  }

  showMessage(
    "customer-address-message",
    "Default delivery address updated successfully."
  );

  await loadCustomerAddresses();
  return;
}
    if (editButton) {
      const addressId = editButton.dataset.editAddress;

      const { data: address, error } = await supabaseClient
        .from("customer_addresses")
        .select("*")
        .eq("id", addressId)
        .eq("user_id", user.id)
        .single();

      if (error || !address) {
        showMessage("customer-address-message",
          "Unable to load this address.", true);
        return;
      }

      editingCustomerAddressId = address.id;

      getElement("address-full-name").value = address.full_name;
      getElement("address-phone").value = address.phone;
      getElement("address-line").value = address.address_line;
      getElement("address-city").value = address.city;
      getElement("address-state").value = address.state;
      getElement("address-country").value = address.country;
      getElement("address-postal-code").value =
        address.postal_code || "";
      getElement("address-is-default").checked =
        address.is_default;

      getElement("customer-address-form")
        .querySelector('button[type="submit"]')
        .textContent = "Update Delivery Address";

      getElement("customer-address-form").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      return;
    }

    if (deleteButton) {
      const addressId = deleteButton.dataset.deleteAddress;

      if (!confirm("Are you sure you want to delete this address?")) {
        return;
      }

      const { error } = await supabaseClient
        .from("customer_addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Address deletion error:", error);
        showMessage("customer-address-message",
          "Unable to delete this address.", true);
        return;
      }

      showMessage("customer-address-message",
        "Delivery address deleted successfully.");

      await loadCustomerAddresses();
    }
  });
}


/* SAVE OR UPDATE CUSTOMER DELIVERY ADDRESS */

const customerAddressForm = getElement(
  "customer-address-form"
);

if (customerAddressForm) {
  customerAddressForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const { data: { user }, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !user) {
      showMessage("customer-address-message",
        "Please log in to save your address.", true);
      return;
    }

    const addressData = {
      full_name: getElement("address-full-name").value.trim(),
      phone: getElement("address-phone").value.trim(),
      address_line: getElement("address-line").value.trim(),
      city: getElement("address-city").value.trim(),
      state: getElement("address-state").value.trim(),
      country: getElement("address-country").value.trim(),
      postal_code:
        getElement("address-postal-code").value.trim() || null,
      is_default: getElement("address-is-default").checked
    };

    if (
      !addressData.full_name ||
      !addressData.phone ||
      !addressData.address_line ||
      !addressData.city ||
      !addressData.state ||
      !addressData.country
    ) {
      showMessage("customer-address-message",
        "Please complete all required fields.", true);
      return;
    }

    if (addressData.is_default) {
      const { error: defaultError } = await supabaseClient
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (defaultError) {
        showMessage("customer-address-message",
          "Unable to update your default address.", true);
        return;
      }
    }

    let result;

    if (editingCustomerAddressId !== null) {
      result = await supabaseClient
        .from("customer_addresses")
        .update(addressData)
        .eq("id", editingCustomerAddressId)
        .eq("user_id", user.id);
    } else {
      result = await supabaseClient
        .from("customer_addresses")
        .insert({
          ...addressData,
          user_id: user.id
        });
    }

    if (result.error) {
      console.error("Address saving error:", result.error);
      showMessage("customer-address-message",
        "Unable to save your address. Please try again.", true);
      return;
    }

    const wasEditing = editingCustomerAddressId !== null;

    editingCustomerAddressId = null;
    customerAddressForm.reset();
    getElement("address-country").value = "Nigeria";

    customerAddressForm
      .querySelector('button[type="submit"]')
      .textContent = "Save Delivery Address";

    showMessage(
      "customer-address-message",
      wasEditing
        ? "Your delivery address has been updated successfully."
        : "Your delivery address has been saved successfully."
    );

    await loadCustomerAddresses();
  });
}

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
   SELLER INVENTORY AND PRODUCT EDITING
========================================= */

async function loadSellerInventory() {
  const container = getElement("seller-inventory-list");
  if (!container) return;

  const { data: authData } = await supabaseClient.auth.getUser();

  if (!authData.user) {
    container.innerHTML = "<p>Please log in to view your products.</p>";
    return;
  }

  container.textContent = "Loading your products...";

  const { data, error } = await supabaseClient
    .from("products")
    .select(`
      id, name, price, category, description, image_url,
      is_available, stock_quantity, track_inventory,
      sku, compare_at_price, status
    `)
    .eq("seller_id", authData.user.id)
    .order("name");

  if (error) {
    showMessage("seller-inventory-message", error.message, true);
    container.innerHTML = "<p>Unable to load your products.</p>";
    return;
  }

  if (!data || !data.length) {
    container.innerHTML = "<p>You have not uploaded any products yet.</p>";
    return;
  }

  container.innerHTML = data.map(product => {
    const id = escapeHTML(String(product.id));
    const image = safeImageURL(product.image_url);

    return `
      <div class="seller-inventory-item">

        ${image ? `
          <img
            src="${image}"
            alt="${escapeHTML(product.name)}"
            style="width:100%;max-width:140px;height:100px;object-fit:contain;">
        ` : ""}

        <h3>${escapeHTML(product.name)}</h3>

        <p>Price: ${formatPrice(product.price)}</p>

        <p>Category: ${escapeHTML(product.category || "")}</p>

        <p>
          Availability:
          ${product.is_available ? "Available" : "Unavailable"}
        </p>

        <p>
          Inventory:
          ${product.track_inventory
            ? Number(product.stock_quantity) + " in stock"
            : "Not tracked"}
        </p>

        <p>Status: ${escapeHTML(product.status || "active")}</p>

        <button
          type="button"
          onclick="editSellerProduct('${id}')">
          Edit Product
        </button>

        <button
          type="button"
          onclick="manageProductVariants('${id}')">
          Manage Variants
        </button>

        <button
          type="button"
          onclick="toggleProductAvailability('${id}', ${!product.is_available})">
          ${product.is_available ? "Hide Product" : "Make Available"}
        </button>

        <div id="edit-product-${id}" hidden></div>

        <div id="product-variants-${id}" hidden></div>

      </div>
    `;
  }).join("");
}


async function editSellerProduct(productId) {
  const { data: authData } = await supabaseClient.auth.getUser();
  const user = authData.user;

  if (!user) {
    showMessage("seller-inventory-message", "Please log in first.", true);
    return;
  }

  const { data: product, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("seller_id", user.id)
    .single();

  if (error || !product) {
    showMessage(
      "seller-inventory-message",
      error?.message || "Product not found.",
      true
    );
    return;
  }

  const editor = getElement("edit-product-" + productId);
  if (!editor) return;

  editor.hidden = false;

  editor.innerHTML = `
    <div class="product-editor">

      <h3>Edit Product</h3>

      <label>Product Name</label>
      <input
        id="edit-name-${productId}"
        type="text"
        value="${escapeHTML(product.name || "")}"
        required>

      <label>Price (₦)</label>
      <input
        id="edit-price-${productId}"
        type="number"
        min="0.01"
        step="0.01"
        value="${Number(product.price)}"
        required>

      <label>Compare-at Price (₦)</label>
      <input
        id="edit-compare-${productId}"
        type="number"
        min="0"
        step="0.01"
        value="${product.compare_at_price ?? ""}">

      <label>Category</label>
      <input
        id="edit-category-${productId}"
        type="text"
        value="${escapeHTML(product.category || "")}"
        required>

      <label>Description</label>
      <textarea
        id="edit-description-${productId}"
        required>${escapeHTML(product.description || "")}</textarea>

      <label>SKU</label>
      <input
        id="edit-sku-${productId}"
        type="text"
        value="${escapeHTML(product.sku || "")}">

      <label>Product Status</label>
      <select id="edit-status-${productId}">
        <option value="active"
          ${product.status === "active" ? "selected" : ""}>
          Active
        </option>

        <option value="draft"
          ${product.status === "draft" ? "selected" : ""}>
          Draft
        </option>

        <option value="archived"
          ${product.status === "archived" ? "selected" : ""}>
          Archived
        </option>
      </select>

      <label>
        <input
          id="edit-available-${productId}"
          type="checkbox"
          ${product.is_available ? "checked" : ""}>
        Product is available
      </label>

      <label>
        <input
          id="edit-track-${productId}"
          type="checkbox"
          ${product.track_inventory ? "checked" : ""}>
        Track inventory
      </label>

      <label>Stock Quantity</label>
      <input
        id="edit-stock-${productId}"
        type="number"
        min="0"
        step="1"
        value="${Number(product.stock_quantity || 0)}">

      <label>Replace Main Product Photo</label>
      <input
        id="edit-image-${productId}"
        type="file"
        accept="image/*">

      <button
        id="save-product-${productId}"
        type="button"
        onclick="saveSellerProduct('${escapeHTML(String(productId))}')">
        Save Changes
      </button>

      <button
        type="button"
        onclick="closeProductEditor('${escapeHTML(String(productId))}')">
        Cancel
      </button>

    </div>
  `;
}


function closeProductEditor(productId) {
  const editor = getElement("edit-product-" + productId);

  if (editor) {
    editor.hidden = true;
    editor.innerHTML = "";
  }
}


async function saveSellerProduct(productId) {
  const { data: authData } = await supabaseClient.auth.getUser();
  const user = authData.user;

  if (!user) {
    showMessage("seller-inventory-message", "Please log in first.", true);
    return;
  }

  const name = getElement("edit-name-" + productId)?.value.trim();
  const price = Number(getElement("edit-price-" + productId)?.value);
  const compareValue = getElement("edit-compare-" + productId)?.value;
  const category = getElement("edit-category-" + productId)?.value.trim();
  const description = getElement("edit-description-" + productId)?.value.trim();
  const sku = getElement("edit-sku-" + productId)?.value.trim();
  const status = getElement("edit-status-" + productId)?.value;
  const available = getElement("edit-available-" + productId)?.checked;
  const trackInventory = getElement("edit-track-" + productId)?.checked;
  const stock = Number(getElement("edit-stock-" + productId)?.value);
  const imageInput = getElement("edit-image-" + productId);
  const imageFile = imageInput?.files?.[0];

  if (
    !name ||
    !category ||
    !description ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    showMessage(
      "seller-inventory-message",
      "Please enter a valid name, category, description, and price.",
      true
    );
    return;
  }

  if (
    compareValue !== "" &&
    (!Number.isFinite(Number(compareValue)) || Number(compareValue) < 0)
  ) {
    showMessage(
      "seller-inventory-message",
      "Enter a valid compare-at price.",
      true
    );
    return;
  }

  if (!["active", "draft", "archived"].includes(status)) {
    showMessage(
      "seller-inventory-message",
      "Choose a valid product status.",
      true
    );
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    showMessage(
      "seller-inventory-message",
      "Stock must be a whole number of zero or more.",
      true
    );
    return;
  }

  if (imageFile) {
    if (
      !imageFile.type.startsWith("image/") ||
      imageFile.size > 5 * 1024 * 1024
    ) {
      showMessage(
        "seller-inventory-message",
        "Choose a valid image no larger than 5MB.",
        true
      );
      return;
    }
  }

  const saveButton = getElement("save-product-" + productId);

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  let uploadedImagePath = null;

  try {
    let imageURL;

    if (imageFile) {
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const imagePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(imagePath, imageFile);

      if (uploadError) throw uploadError;

      uploadedImagePath = imagePath;

      const { data: publicData } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(imagePath);

      imageURL = publicData.publicUrl;
    }

    const updates = {
      name,
      price,
      compare_at_price:
        compareValue === "" ? null : Number(compareValue),
      category,
      description,
      sku: sku || null,
      status,
      is_available: available,
      track_inventory: trackInventory,
      stock_quantity: stock,
      updated_at: new Date().toISOString()
    };

    if (imageURL) {
      updates.image_url = imageURL;
    }

    const { error } = await supabaseClient
      .from("products")
      .update(updates)
      .eq("id", productId)
      .eq("seller_id", user.id);

    if (error) throw error;

    showMessage(
      "seller-inventory-message",
      "Product updated successfully."
    );

    await loadSellerInventory();
    await loadProducts();

  } catch (error) {
    console.error("Product update error:", error);

    if (uploadedImagePath) {
      const { error: cleanupError } = await supabaseClient.storage
        .from("product-images")
        .remove([uploadedImagePath]);

      if (cleanupError) {
        console.error("Uploaded image cleanup error:", cleanupError);
      }
    }

    showMessage(
      "seller-inventory-message",
      error.message || "Unable to update product.",
      true
    );

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save Changes";
    }
  }
}


async function toggleProductAvailability(productId, available) {
  const { data: authData } = await supabaseClient.auth.getUser();

  if (!authData.user) {
    showMessage("seller-inventory-message", "Please log in first.", true);
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .update({
      is_available: available,
      updated_at: new Date().toISOString()
    })
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
   SELLER PRODUCT VARIANTS
========================================= */

async function manageProductVariants(productId) {
  const container = getElement(`product-variants-${productId}`);
  if (!container) return;

  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) {
    showMessage("seller-inventory-message", "Please log in again.", true);
    return;
  }

  container.hidden = false;
  container.innerHTML = "<p>Loading product variants...</p>";

  const { data: product, error: productError } = await supabaseClient
    .from("products")
    .select("id, name, price")
    .eq("id", productId)
    .eq("seller_id", authData.user.id)
    .maybeSingle();

  if (productError || !product) {
    container.innerHTML = "<p>Unable to load this product.</p>";
    return;
  }

  const { data: variants, error } = await supabaseClient
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("id");

  if (error) {
    container.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  container.innerHTML = `
    <h4>Manage Variants: ${escapeHTML(product.name)}</h4>

    <div class="variant-form">
      <label>Size</label>
      <input id="variant-size-${productId}" type="text"
        placeholder="e.g. Small, Medium, Large">

      <label>Colour</label>
      <input id="variant-color-${productId}" type="text"
        placeholder="e.g. Black, Blue, Red">

      <label>Variant SKU (optional)</label>
      <input id="variant-sku-${productId}" type="text"
        placeholder="Variant SKU">

      <label>Price override (optional)</label>
      <input id="variant-price-${productId}" type="number"
        min="0" step="0.01" placeholder="Leave blank to use ₦${Number(product.price).toLocaleString()}">

      <label>Stock quantity</label>
      <input id="variant-stock-${productId}" type="number"
        min="0" step="1" value="0">

      <button type="button"
        onclick="addProductVariant('${productId}')">
        Add Variant
      </button>
    </div>

    <div id="variant-list-${productId}">
      ${variants.length ? variants.map(variant => `
        <div class="variant-item">
          <p>
            <strong>${escapeHTML(variant.size || "No size")}</strong>
            ${variant.color ? ` — ${escapeHTML(variant.color)}` : ""}
          </p>
          <p>SKU: ${escapeHTML(variant.sku || "Not set")}</p>
          <p>Stock: ${Number(variant.stock_quantity)}</p>
          <p>Price: ${
            variant.price_override === null
              ? "Use product price"
              : "₦" + Number(variant.price_override).toLocaleString()
          }</p>
          <p>Status: ${variant.is_available ? "Available" : "Unavailable"}</p>

          <button type="button"
            onclick="editProductVariant('${productId}', '${variant.id}')">
            Edit
          </button>

          <button type="button"
            onclick="deleteProductVariant('${productId}', '${variant.id}')">
            Delete
          </button>
        </div>
      `).join("") : "<p>No variants added yet.</p>"}
    </div>
  `;
}

async function addProductVariant(productId) {
  const size = getElement(`variant-size-${productId}`).value.trim();
  const color = getElement(`variant-color-${productId}`).value.trim();
  const sku = getElement(`variant-sku-${productId}`).value.trim();
  const priceValue = getElement(`variant-price-${productId}`).value.trim();
  const stockValue = getElement(`variant-stock-${productId}`).value;

  if (!size && !color) {
    alert("Enter a size or colour for this variant.");
    return;
  }

  const stock = Number(stockValue);
  const price = priceValue === "" ? null : Number(priceValue);

  if (!Number.isInteger(stock) || stock < 0) {
    alert("Enter a valid stock quantity.");
    return;
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    alert("Enter a valid price.");
    return;
  }

  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;

  const { data: product } = await supabaseClient
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", authData.user.id)
    .maybeSingle();

  if (!product) {
    alert("You do not have permission to edit this product.");
    return;
  }

  const { error } = await supabaseClient
    .from("product_variants")
    .insert({
      product_id: productId,
      size: size || null,
      color: color || null,
      sku: sku || null,
      price_override: price,
      stock_quantity: stock,
      is_available: true
    });

  if (error) {
    alert("Unable to add variant: " + error.message);
    return;
  }

  await manageProductVariants(productId);
}

async function editProductVariant(productId, variantId) {
  const { data: variant, error } = await supabaseClient
    .from("product_variants")
    .select("*")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !variant) {
    alert("Unable to load this variant.");
    return;
  }

  const editor = document.createElement("div");
  editor.id = `edit-variant-${variantId}`;
  editor.className = "variant-edit-form";

  editor.innerHTML = `
    <label>Size</label>
    <input id="edit-variant-size-${variantId}" type="text"
      value="${escapeHTML(variant.size || "")}">

    <label>Colour</label>
    <input id="edit-variant-color-${variantId}" type="text"
      value="${escapeHTML(variant.color || "")}">

    <label>SKU</label>
    <input id="edit-variant-sku-${variantId}" type="text"
      value="${escapeHTML(variant.sku || "")}">

    <label>Price override</label>
    <input id="edit-variant-price-${variantId}" type="number"
      min="0" step="0.01"
      value="${variant.price_override === null ? "" : Number(variant.price_override)}">

    <label>Stock quantity</label>
    <input id="edit-variant-stock-${variantId}" type="number"
      min="0" step="1" value="${Number(variant.stock_quantity)}">

    <label>
      <input id="edit-variant-available-${variantId}" type="checkbox"
        ${variant.is_available ? "checked" : ""}>
      Available for purchase
    </label>

    <button type="button"
      onclick="saveProductVariant('${productId}', '${variantId}')">
      Save Changes
    </button>

    <button type="button"
      onclick="manageProductVariants('${productId}')">
      Cancel
    </button>
  `;

  const existing = getElement(`edit-variant-${variantId}`);
  if (existing) existing.remove();

  const list = getElement(`variant-list-${productId}`);
  list.prepend(editor);
}

async function saveProductVariant(productId, variantId) {
  const size = getElement(`edit-variant-size-${variantId}`).value.trim();
  const color = getElement(`edit-variant-color-${variantId}`).value.trim();
  const sku = getElement(`edit-variant-sku-${variantId}`).value.trim();
  const priceValue = getElement(`edit-variant-price-${variantId}`).value.trim();
  const stockValue = getElement(`edit-variant-stock-${variantId}`).value;
  const isAvailable = getElement(`edit-variant-available-${variantId}`).checked;

  if (!size && !color) {
    alert("A variant must have a size or colour.");
    return;
  }

  const stock = Number(stockValue);
  const price = priceValue === "" ? null : Number(priceValue);

  if (!Number.isInteger(stock) || stock < 0) {
    alert("Enter a valid stock quantity.");
    return;
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    alert("Enter a valid price.");
    return;
  }

  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;

  const { data: product } = await supabaseClient
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", authData.user.id)
    .maybeSingle();

  if (!product) {
    alert("You do not have permission to edit this product.");
    return;
  }

  const { error } = await supabaseClient
    .from("product_variants")
    .update({
      size: size || null,
      color: color || null,
      sku: sku || null,
      price_override: price,
      stock_quantity: stock,
      is_available: isAvailable,
      updated_at: new Date().toISOString()
    })
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) {
    alert("Unable to update variant: " + error.message);
    return;
  }

  await manageProductVariants(productId);
}

async function deleteProductVariant(productId, variantId) {
  if (!confirm("Are you sure you want to delete this variant?")) return;

  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;

  const { data: product } = await supabaseClient
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", authData.user.id)
    .maybeSingle();

  if (!product) {
    alert("You do not have permission to delete this variant.");
    return;
  }

  const { error } = await supabaseClient
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) {
    alert("Unable to delete variant: " + error.message);
    return;
  }

  await manageProductVariants(productId);
}

/* Make functions available to inline HTML buttons */
window.manageProductVariants = manageProductVariants;
window.addProductVariant = addProductVariant;
window.editProductVariant = editProductVariant;
window.saveProductVariant = saveProductVariant;
window.deleteProductVariant = deleteProductVariant;
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

  container.innerHTML = data.map((order, index) => {
    const currentStatus = String(
      order.seller_fulfillment_status || "pending"
    ).toLowerCase();

    const allowedStatuses = [
      "confirmed",
      "shipped",
      "delivered",
      "cancelled"
    ];

    return `
      <div class="cart-section">
        <h3>Order #${escapeHTML(order.order_id)}</h3>

        <p>Product: ${escapeHTML(order.product_name)}</p>

        <p>Quantity: ${Number(order.quantity)}</p>

        <p>Unit Price: ${formatPrice(order.unit_price)}</p>

        <p>Date: ${escapeHTML(order.order_date || "")}</p>

        <p>
          Marketplace Order Status:
          <span class="order-status ${getStatusClass(order.order_status)}">
            ${escapeHTML(String(order.order_status || "").toUpperCase())}
          </span>
        </p>

        <p>
          Your Fulfilment Status:
          <span class="order-status ${getStatusClass(currentStatus)}">
            ${escapeHTML(currentStatus.toUpperCase())}
          </span>
        </p>

        <label for="seller-status-${escapeHTML(order.order_item_id)}">
          Update Your Fulfilment Status:
        </label>

        <select id="seller-status-${escapeHTML(order.order_item_id)}">
          <option value="">Choose new status</option>
          ${allowedStatuses.map(status => `
            <option value="${status}">${status.toUpperCase()}</option>
          `).join("")}
        </select>

        <button
          type="button"
          class="save-seller-order-status"
          data-order-item-id="${escapeHTML(order.order_item_id)}"
        >
          Save Status
        </button>

        <button
          type="button"
          class="view-customer-details"
          data-order-index="${index}"
        >
          View Customer Details
        </button>

        <div
          class="customer-details"
          id="customer-details-${index}"
          hidden
        >
          <h4>Customer Delivery Details</h4>
          <p>Name: ${escapeHTML(order.customer_name || "Not provided")}</p>
          <p>Phone: ${escapeHTML(order.customer_phone || "Not provided")}</p>
          <p>Address: ${escapeHTML(order.delivery_address || "Not provided")}</p>
          <p>City: ${escapeHTML(order.delivery_city || "Not provided")}</p>
          <p>State: ${escapeHTML(order.delivery_state || "Not provided")}</p>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".view-customer-details").forEach(button => {
    button.addEventListener("click", () => {
      const index = button.dataset.orderIndex;
      const details = getElement(`customer-details-${index}`);

      if (!details) return;

      details.hidden = !details.hidden;

      button.textContent = details.hidden
        ? "View Customer Details"
        : "Hide Customer Details";
    });
  });

  container.querySelectorAll(".save-seller-order-status").forEach(button => {
    button.addEventListener("click", () => {
      updateMySellerOrderStatus(button.dataset.orderItemId, button);
    });
  });
}

/* =========================================
   UPDATE SELLER ORDER FULFILMENT STATUS
========================================= */

async function updateMySellerOrderStatus(orderItemId, button) {
  const select = getElement(`seller-status-${orderItemId}`);

  if (!select) return;

  const newStatus = select.value;

  const allowedStatuses = [
    "confirmed",
    "shipped",
    "delivered",
    "cancelled"
  ];

  if (!allowedStatuses.includes(newStatus)) {
    showMessage(
      "seller-orders-message",
      "Please choose a valid fulfilment status.",
      true
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Saving...";

  const { data, error } = await supabaseClient.rpc(
    "update_my_seller_order_status",
    {
      p_order_item_id: orderItemId,
      p_new_status: newStatus
    }
  );

  if (error || data !== true) {
    showMessage(
      "seller-orders-message",
      error ? error.message : "Unable to update fulfilment status.",
      true
    );

    button.disabled = false;
    button.textContent = "Save Status";
    return;
  }

  showMessage(
    "seller-orders-message",
    "Your fulfilment status has been updated successfully.",
    false
  );

  await loadSellerOrders();
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
      <h3>${escapeHTML(application.business_name || "Seller Application")}</h3>

      <p>Email: ${escapeHTML(application.email || "Not provided")}</p>

      <p>Phone: ${escapeHTML(application.phone || "Not provided")}</p>

      <p>Address: ${escapeHTML(application.business_address || "Not provided")}</p>

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
   
getElement("customer-refresh-orders")
  ?.addEventListener("click", loadCustomerOrderHistory);
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
