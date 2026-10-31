const SUPABASE_URL = "https://xdmuygtrzqznbywvzypl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UGRcI_2l6Vpl7QroGTVFiw_J818DtOC";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let allProducts = [];
let wishlist = [];

try {
  wishlist = JSON.parse(localStorage.getItem("allzyWishlist") || "[]");
  if (!Array.isArray(wishlist)) wishlist = [];
} catch {
  wishlist = [];
}


function updateWishlistCount() {
  const count = document.getElementById("wishlist-count");

  if (count) {
    count.textContent = wishlist.length;
  }
}
updateWishlistCount();
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
    productList.innerHTML =
      "<p>Unable to load products. Please try again later.</p>";
    return;
  }

  allProducts = data || [];

  if (allProducts.length === 0) {
    productList.innerHTML = "<p>No products available yet.</p>";
    return;
  }

  renderProducts(allProducts);
}


function renderProducts(productsToShow) {
  const productList = document.getElementById("products");
  if (!productList) return;

  if (productsToShow.length === 0) {
    productList.innerHTML = "<p>No matching products found.</p>";
    return;
  }

  productList.innerHTML = productsToShow.map((product, index) => `
    <article class="product">
      ${product.image_url ? `
        <img
          src="${product.image_url}"
          alt=""
          class="product-image"
        >
      ` : ""}

      <h3 class="product-title">${product.name}</h3>

<p class="product-description">
  ${product.description || ""}
</p>


      <p class="product-price">
  ₦${Number(product.price).toLocaleString("en-NG")}
</p>

      <button
  type="button"
  class="wishlist-button"
  data-product-id="${product.id}"
>
  ${wishlist.some(id => String(id) === String(product.id))
    ? "♥ Saved to Wishlist"
    : "♡ Add to Wishlist"}
</button>

      <button
        type="button"
        class="view-product-details"

        data-index="${index}"
      >
        View Details
      </button>

      <button
        type="button"
        class="add-to-cart"
        data-index="${index}"
      >
        Add to Cart
      </button>
    </article>
  `).join("");

  productList.querySelectorAll(".view-product-details").forEach(button => {
    button.addEventListener("click", function() {
      const product = productsToShow[Number(this.dataset.index)];
      const detailsSection = document.getElementById("product-details");
      const detailsContent = document.getElementById("product-details-content");

      if (!product || !detailsSection || !detailsContent) return;

      detailsContent.innerHTML = `
        ${product.image_url ? `
          <img
            src="${product.image_url}"
            alt="${product.name}"
            style="width:100%;max-width:400px;height:300px;object-fit:contain;"
          >
        ` : ""}

        <h2>${product.name}</h2>
        <p>${product.description || "No product description available."}</p>
        <h3>₦${Number(product.price).toLocaleString("en-NG")}</h3>

        <button type="button" id="details-add-to-cart">
          Add to Cart
        </button>
      `;

      productList.hidden = true;
      detailsSection.hidden = false;

      document.getElementById("details-add-to-cart").addEventListener("click", function() {
        window.addToCart(
          product.id,
          product.name,
          Number(product.price)
        );
      });
    });
  });

  
  productList.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", function() {
      const product = productsToShow[Number(this.dataset.index)];

      if (!product) return;

      window.addToCart(
        product.id,
        product.name,
        Number(product.price)
      );
    });
  });

  productList.querySelectorAll(".wishlist-button").forEach(button => {
    button.addEventListener("click", function() {
      const productId = String(this.dataset.productId);

      const alreadySaved = wishlist.some(
        id => String(id) === productId
      );

      if (alreadySaved) {
        wishlist = wishlist.filter(
          id => String(id) !== productId
        );
      } else {
        wishlist.push(productId);
      }

      localStorage.setItem("allzyWishlist", JSON.stringify(wishlist));
      updateWishlistCount();

      this.textContent = alreadySaved
        ? "♡ Add to Wishlist"
        : "♥ Saved to Wishlist";
    });
  });
}

function displayWishlist() {
  const wishlistSection = document.getElementById("wishlist-section");
  const wishlistProducts = document.getElementById("wishlist-products");

  if (!wishlistSection || !wishlistProducts) return;

  const savedProducts = allProducts.filter(product =>
    wishlist.some(id => String(id) === String(product.id))
  );

  if (savedProducts.length === 0) {
    wishlistProducts.innerHTML = "<p>Your Wishlist is empty.</p>";
    return;
  }

  wishlistProducts.innerHTML = savedProducts.map(product => `
    <article class="product">
      ${product.image_url ? `
        <img
          src="${product.image_url}"
          alt="${product.name}"
          style="width:100%;max-width:300px;height:200px;object-fit:contain;"
        >
      ` : ""}

      <h3>${product.name}</h3>
      <p>₦${Number(product.price).toLocaleString("en-NG")}</p>

      <button
        type="button"
        class="wishlist-remove-button"
        data-product-id="${product.id}"
      >
        Remove from Wishlist
      </button>

      <button
        type="button"
        class="wishlist-add-to-cart"
        data-product-id="${product.id}"
      >
        Add to Cart
      </button>
    </article>
  `).join("");

  wishlistProducts.querySelectorAll(".wishlist-remove-button").forEach(button => {
    button.addEventListener("click", function() {
      const productId = String(this.dataset.productId);

      wishlist = wishlist.filter(id => String(id) !== productId);

      localStorage.setItem("allzyWishlist", JSON.stringify(wishlist));
      updateWishlistCount();
      displayWishlist();
      renderProducts(allProducts);
    });
  });

  wishlistProducts.querySelectorAll(".wishlist-add-to-cart").forEach(button => {
    button.addEventListener("click", function() {
      const product = savedProducts.find(
        item => String(item.id) === String(this.dataset.productId)
      );

      if (!product) return;

      window.addToCart(
        product.id,
        product.name,
        Number(product.price)
      );
    });
  });
}

const wishlistToggle = document.getElementById("wishlist-toggle");

if (wishlistToggle) {
  wishlistToggle.addEventListener("click", function() {
    const wishlistSection = document.getElementById("wishlist-section");

    if (!wishlistSection) return;

    wishlistSection.hidden = !wishlistSection.hidden;

    if (!wishlistSection.hidden) {
      displayWishlist();
    }
  });
}

const closeDetailsButton = document.getElementById("close-product-details");

if (closeDetailsButton) {
  closeDetailsButton.addEventListener("click", function() {
    const detailsSection = document.getElementById("product-details");
    const productList = document.getElementById("products");

    if (detailsSection) detailsSection.hidden = true;
    if (productList) productList.hidden = false;
  });
}

const categorySelect = document.getElementById("product-category");
const sortSelect = document.getElementById("product-sort");
const searchInput = document.getElementById("product-search");

function filterProducts() {
  const searchTerm = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const selectedCategory = categorySelect
    ? categorySelect.value.toLowerCase().trim()
    : "";

  const categoryGroups = {
    fashion: ["fashion", "clothing", "clothes", "tops", "shirts", "t-shirts"],
    bags: ["bags", "bag"],
    shoes: ["shoes", "shoe", "slippers", "footwear", "sandals"],
    electronics: [
      "electronics",
      "power bank",
      "power banks",
      "phone accessories",
      "headphones & audio",
      "headphones",
      "audio",
      "charger",
      "chargers"
    ],
    beauty: ["beauty", "skincare", "makeup", "cosmetics"],
    kids: ["kids", "children", "childrens", "girls' dresses", "baby"],
    "home & living": ["home & living", "home", "living", "household"]
  };

  const filteredProducts = allProducts.filter(product => {
    const name = (product.name || "").toLowerCase();
    const description = (product.description || "").toLowerCase();
    const productCategory = (product.category || "").toLowerCase().trim();

    const matchesSearch =
      name.includes(searchTerm) ||
      description.includes(searchTerm) ||
      productCategory.includes(searchTerm);

    const allowedCategories = categoryGroups[selectedCategory];

    const matchesCategory =
      !selectedCategory ||
      productCategory === selectedCategory ||
      (allowedCategories &&
        allowedCategories.includes(productCategory));

    return matchesSearch && matchesCategory;
  });

      const sortOption = sortSelect ? sortSelect.value : "recommended";

  const sortedProducts = [...filteredProducts];

  if (sortOption === "price-low-high") {
    sortedProducts.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortOption === "price-high-low") {
    sortedProducts.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortOption === "name-a-z") {
    sortedProducts.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  } else if (sortOption === "newest") {
    sortedProducts.sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }

  renderProducts(sortedProducts);
}

if (searchInput) {
  searchInput.addEventListener("input", filterProducts);
}


if (categorySelect) {
  categorySelect.addEventListener("change", filterProducts);
}

if (sortSelect) {
  sortSelect.addEventListener("change", filterProducts);
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

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <p><strong>${item.name}</strong></p>
      <p>Price: ₦${item.price.toLocaleString("en-NG")}</p>

      <div class="cart-quantity-controls">
        <button type="button" onclick="changeCartQuantity(${index}, -1)">−</button>
        <span>Quantity: ${item.quantity}</span>
        <button type="button" onclick="changeCartQuantity(${index}, 1)">+</button>
      </div>

      <p>Subtotal: ₦${(item.price * item.quantity).toLocaleString("en-NG")}</p>
      <button type="button" onclick="removeFromCart('${item.name}')">Remove</button>
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
window.changeCartQuantity = function(index, change) {
  const item = cart[index];

  if (!item) return;

  item.quantity += change;

  if (item.quantity < 1) {
    item.quantity = 1;
  }

  displayCart();
};

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

      
const orderNumber = Number(data.order_id);
const orderTotal = Number(data.total_amount).toLocaleString("en-NG");

const confirmation = document.createElement("div");
confirmation.className = "order-confirmation";
confirmation.setAttribute("role", "status");

confirmation.innerHTML = `
  <h2>Order Placed Successfully!</h2>
  <p>Thank you for shopping with Allzy Market.</p>
  <p><strong>Order Number:</strong> #${orderNumber}</p>
  <p><strong>Order Total:</strong> ₦${orderTotal}</p>
  <p>Your order has been received. You can track its progress using your order number and phone number.</p>
  <button type="button" id="track-new-order">Track My Order</button>
`;

orderForm.insertAdjacentElement("afterend", confirmation);

document.getElementById("track-new-order").addEventListener("click", function() {
  const trackingOrderInput = document.getElementById("tracking-order-id");
  const trackingPhoneInput = document.getElementById("tracking-phone");
  const trackingForm = document.getElementById("track-order-form");

  if (trackingOrderInput) trackingOrderInput.value = orderNumber;
  if (trackingPhoneInput) trackingPhoneInput.value = customerPhone;

  if (trackingForm) {
    trackingForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
});

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
  if (data.session) {
    const { error: applicationError } = await supabaseClient.rpc(
      "submit_seller_application"
    );

    if (applicationError) {
      message.textContent =
        "Account created, but application submission failed: " +
        applicationError.message +
        ". Please log in and try again.";
    } else {
      message.textContent =
        "Registration successful! Your seller application has been submitted and is pending approval.";
    }
  } else {
    message.textContent =
      "Account created! Please check your email to confirm your account. After confirming, log in to submit your seller application.";
  }

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
    const category = document.getElementById("seller-product-category").value.trim();
    const description = document.getElementById("product-description").value.trim();
    const imageInput = document.getElementById("product-image");
const imageFile = imageInput.files[0];

    if(!name||!category||!description||!imageFile||price<=0) {
 message.textContent="Please complete every field and choose a product photo.";return;
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

      const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
const imagePath = `${user.id}/${Date.now()}-${safeFileName}`;

if (!imageFile.type.startsWith("image/")) {
  throw new Error("Please choose a valid image file.");
}

if (imageFile.size > 5 * 1024 * 1024) {
  throw new Error("Your photo must be smaller than 5 MB.");
}

message.textContent = "Uploading product photo...";

const { error: imageError } = await supabaseClient.storage
  .from("product-images")
  .upload(imagePath, imageFile, {
    cacheControl: "3600",
    upsert: false
  });

if (imageError) throw imageError;

const { data: imageData } = supabaseClient.storage
  .from("product-images")
  .getPublicUrl(imagePath);

const imageUrl = imageData.publicUrl;

const { error: insertError } = await supabaseClient.schema("public").from("products").insert({
  name,
  price,
  category,
  description,
  image_url: imageUrl,
  seller_id: user.id,
  is_available: true
});

if (insertError) throw insertError;

      message.textContent = "Product added successfully!";
sellerProductForm.reset();
await loadProducts();
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
let customerPasswordRecoveryActive = false;
async function updateSellerLoginStatus() {
  if (customerPasswordRecoveryActive) return;
  const message = document.getElementById("seller-login-message");
  const productSection = document.getElementById("seller-products");
  const inventorySection = document.getElementById("seller-inventory-section");
const sellerOrdersSection =
  document.getElementById("seller-orders-section");
  if (!message || !productSection) return;

  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) throw error;

    if (!data.user) {
      message.textContent = "Please log in with your seller account.";
      if (sellerLogoutButton) sellerLogoutButton.hidden = true;
      productSection.hidden = true;
      if (inventorySection) inventorySection.hidden = true;
      if (sellerOrdersSection) sellerOrdersSection.hidden = true;
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
      if (inventorySection) {
  inventorySection.hidden = false;
  await loadSellerInventory();
}

  if (sellerOrdersSection) {
    sellerOrdersSection.hidden = false;
    await loadMySellerOrders();
  }
} else {
  message.textContent = "Your seller account is pending approval.";
  productSection.hidden = true;
  if (inventorySection) inventorySection.hidden = true;

  if (sellerOrdersSection) sellerOrdersSection.hidden = true;
}
  } catch (error) {
    console.error("Seller status error:", error);
    message.textContent = "Could not check seller status. Please refresh and try again.";
    productSection.hidden = true;
    if (sellerOrdersSection) sellerOrdersSection.hidden = true;
    if (inventorySection) inventorySection.hidden = true;
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

      const { error: applicationError } = await supabaseClient.rpc(
        "submit_seller_application"
      );

      if (applicationError) {
        console.error("Seller application submission error:", applicationError);
      }

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

const sellerOrdersSection =
  document.getElementById("seller-orders-section");
if (sellerOrdersSection) sellerOrdersSection.hidden = true;

const sellerOrdersMessage =
  document.getElementById("seller-orders-message");
const sellerOrdersList =
  document.getElementById("seller-orders-list");

if (sellerOrdersMessage) sellerOrdersMessage.textContent = "";
if (sellerOrdersList) sellerOrdersList.innerHTML = "";

    } catch (error) {
      message.textContent = "Logout failed: " + error.message;
    }
  });
}

if (sellerLoginForm) {
  updateSellerLoginStatus();
}

// Allzy Market Admin Dashboard
const adminLoginForm = document.getElementById("admin-login-form");
const adminMessage = document.getElementById("admin-message");
const adminOrdersSection = document.getElementById("admin-orders-section");
const adminOrdersList = document.getElementById("admin-orders-list");
const adminRefreshButton = document.getElementById("admin-refresh-orders");
const adminLogoutButton = document.getElementById("admin-logout-button");

async function loadAdminOrders() {
  adminMessage.textContent = "Loading customer orders...";
  adminOrdersList.innerHTML = "";

  const { data: orders, error } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin orders error:", error);
    adminMessage.textContent =
      "Could not load orders. Check your admin permissions.";
    return;
  }

  const { data: items, error: itemsError } = await supabaseClient
    .from("order_items")
    .select("*");

  if (itemsError) {
    console.error("Admin order items error:", itemsError);
    adminMessage.textContent = "Orders loaded, but order items could not be loaded.";
    return;
  }

  if (!orders || orders.length === 0) {
    adminOrdersList.innerHTML = "<p>No customer orders found.</p>";
    adminMessage.textContent = "Admin access verified.";
    return;
  }

  const allowedStatuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
];

  adminOrdersList.innerHTML = orders.map(order => {
    const orderItems = (items || []).filter(
      item => String(item.order_id) === String(order.id)
    );

    const itemHtml = orderItems.length
      ? orderItems.map(item => `
          <li>
            ${item.product_name || "Product"} —
            Quantity: ${Number(item.quantity)} —
            ₦${Number(item.unit_price).toLocaleString("en-NG")}
          </li>
        `).join("")
      : "<li>No order items found.</li>";

    const statusOptions = allowedStatuses.map(status => `
      <option value="${status}" ${
        order.status === status ? "selected" : ""
      }>${status}</option>
    `).join("");

    return `
      <article class="cart-section">
        <h4>Order #${order.id}</h4>
        <p><strong>Customer:</strong> ${escapeAdminText(order.customer_name)}</p>
        <p><strong>Phone:</strong> ${escapeAdminText(order.customer_phone)}</p>
        <p><strong>Address:</strong> ${escapeAdminText(order.delivery_address)},
          ${escapeAdminText(order.delivery_city)},
          ${escapeAdminText(order.delivery_state)}</p>
        <p><strong>Total:</strong> ₦${Number(order.total_amount).toLocaleString("en-NG")}</p>
        <p><strong>Date:</strong> ${escapeAdminText(order.created_at)}</p>
        <p><strong>Items:</strong></p>
        <ul>${itemHtml}</ul>
        <label for="admin-status-${order.id}">Order status</label>
        <select id="admin-status-${order.id}" class="admin-order-status">
          ${statusOptions}
        </select>
        <button type="button" data-order-id="${order.id}" class="admin-save-status">
          Save Status
        </button>
      </article>
    `;
  }).join("");

  adminOrdersList.querySelectorAll(".admin-save-status").forEach(button => {
    button.addEventListener("click", async function() {
      const orderId = Number(this.dataset.orderId);
      const statusSelect = document.getElementById(`admin-status-${orderId}`);
      const newStatus = statusSelect.value;

      this.disabled = true;
      this.textContent = "Saving...";

      try {
        const { data, error } = await supabaseClient.rpc(
          "admin_update_order_status",
          {
            p_order_id: orderId,
            p_new_status: newStatus
          }
        );

        if (error) throw error;

        if (data !== true) {
          throw new Error("Order was not updated. Check the order number.");
        }

        adminMessage.textContent = `Order #${orderId} updated to ${newStatus}.`;
      } catch (error) {
        console.error("Order status update failed:", error);
        adminMessage.textContent =
          "Update failed: " + error.message;
      } finally {
        this.disabled = false;
        this.textContent = "Save Status";
      }
    });
  });

  adminMessage.textContent = `Admin access verified. ${orders.length} order(s) found.`;
}

function escapeAdminText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    const submitButton = adminLoginForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    adminMessage.textContent = "Signing in... Please wait.";
alert("Admin login button is working. Connecting to Supabase...");

    try {
      const { error: loginError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) throw loginError;

      const { data: isAdmin, error: adminError } =
        await supabaseClient.rpc("is_marketplace_admin");

      if (adminError) throw adminError;

      if (isAdmin !== true) {
        await supabaseClient.auth.signOut();
        throw new Error("This account is not authorized as an administrator.");
      }

      adminLoginForm.hidden = true;
      adminOrdersSection.hidden = false;
      await loadAdminOrders();
    } catch (error) {
      console.error("Admin login failed:", error);
      adminMessage.textContent = error.message || "Admin login failed.";
    } finally {
      submitButton.disabled = false;
    }
  });
}

if (adminRefreshButton) {
  adminRefreshButton.addEventListener("click", loadAdminOrders);
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", async function() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      adminMessage.textContent = "Could not log out. Please try again.";
      return;
    }

    adminLoginForm.hidden = false;
    adminLoginForm.reset();
    adminOrdersSection.hidden = true;
    adminOrdersList.innerHTML = "";
    adminMessage.textContent = "You have logged out.";
  });
}


// Allzy Market Seller Approval
const sellerApplicationsList = document.getElementById("seller-applications-list");
const sellerApplicationsMessage = document.getElementById("seller-applications-message");
const refreshSellerApplicationsButton = document.getElementById("refresh-seller-applications");

async function loadSellerApplications() {
  sellerApplicationsMessage.textContent = "Loading seller applications...";
  sellerApplicationsList.innerHTML = "";

  const { data: applications, error } = await supabaseClient
    .from("seller_applications")
    .select("*")
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Seller applications error:", error);
    sellerApplicationsMessage.textContent = "Could not load seller applications.";
    return;
  }

  if (!applications || applications.length === 0) {
    sellerApplicationsMessage.textContent = "No seller applications yet.";
    return;
  }

  sellerApplicationsList.innerHTML = applications.map(application => `
    <article class="cart-section">
      <h3>${escapeAdminText(application.business_name)}</h3>
      <p>Contact: ${escapeAdminText(application.contact_name)}</p>
      <p>Phone: ${escapeAdminText(application.phone)}</p>
      <p>Status: ${escapeAdminText(application.status)}</p>
      ${
        application.status === "pending"
          ? `
            <button type="button" data-application-id="${application.id}" data-status="approved" class="seller-review-button">Approve</button>
            <button type="button" data-application-id="${application.id}" data-status="rejected" class="seller-review-button">Reject</button>
          `
          : ""
      }
    </article>
  `).join("");

  sellerApplicationsList.querySelectorAll(".seller-review-button").forEach(button => {
    button.addEventListener("click", async function() {
      const applicationId = Number(this.dataset.applicationId);
      const newStatus = this.dataset.status;

      this.disabled = true;
      sellerApplicationsMessage.textContent = "Saving seller decision...";

      const { data, error } = await supabaseClient.rpc("admin_review_seller", {
        p_application_id: applicationId,
        p_new_status: newStatus
      });

      if (error) {
        console.error("Seller review error:", error);
        sellerApplicationsMessage.textContent = "Could not update seller application: " + error.message;
        this.disabled = false;
        return;
      }

      if (data !== true) {
        sellerApplicationsMessage.textContent = "Application was not updated. It may already have been reviewed.";
        await loadSellerApplications();
        return;
      }

      sellerApplicationsMessage.textContent = "Seller application " + newStatus + " successfully.";
      await loadSellerApplications();
    });
  });

  sellerApplicationsMessage.textContent = applications.length + " seller application(s) found.";
}

if (refreshSellerApplicationsButton) {
  refreshSellerApplicationsButton.addEventListener("click", loadSellerApplications);
}


async function loadMySellerOrders() {
  const message = document.getElementById("seller-orders-message");
  const list = document.getElementById("seller-orders-list");

  if (!message || !list) return;

  message.textContent = "Loading your orders...";
  list.innerHTML = "";

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!userData.user) {
      throw new Error("Please log in to view your orders.");
    }

    const { data, error } = await supabaseClient.rpc(
      "get_my_seller_orders"
    );

    if (error) throw error;

    if (!data || data.length === 0) {
      message.textContent = "No orders for your products yet.";
      return;
    }

 
    list.innerHTML = data.map(order => `
      <article class="cart-section">
        <h3>Order #${escapeAdminText(order.order_id)}</h3>
        <p><strong>Date:</strong> ${new Date(order.order_date).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
        <p><strong>Order Status:</strong> <span class="order-status status-${String(order.order_status || "").toLowerCase().replace(/[^a-z]/g, "")}">${escapeAdminText(order.order_status)}</span></p>
        <p><strong>Product:</strong> ${escapeAdminText(order.product_name)}</p>
        <p><strong>Quantity:</strong> ${Number(order.quantity)}</p>
        <p><strong>Price per item:</strong> ₦${Number(order.unit_price).toLocaleString("en-NG")}</p>
        <p><strong>Item total:</strong> ₦${(Number(order.unit_price) * Number(order.quantity)).toLocaleString("en-NG")}</p>
      </article>
    `).join("");


    message.textContent = data.length + " order item(s) found.";
  } catch (error) {
    console.error("Seller orders error:", error);
    message.textContent = "Could not load your orders: " + error.message;
  }
}

const sellerRefreshOrdersButton =
  document.getElementById("seller-refresh-orders");

if (sellerRefreshOrdersButton) {
  sellerRefreshOrdersButton.addEventListener(
    "click",
    loadMySellerOrders
  );
}


async function loadSellerInventory() {
  const message = document.getElementById("seller-inventory-message");
  const list = document.getElementById("seller-inventory-list");
  const section = document.getElementById("seller-inventory-section");

  if (!message || !list || !section) return;

  message.textContent = "Loading your products...";
  list.innerHTML = "";

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError) throw userError;

    const user = userData.user;

    if (!user) {
      throw new Error("Please log in as a seller first.");
    }

    const { data: products, error } = await supabaseClient
      .from("products")
      .select("id, name, price, category, description, image_url, is_available")
      .eq("seller_id", user.id)
      .order("name");

    if (error) throw error;

    if (!products || products.length === 0) {
      message.textContent = "You haven't uploaded any products yet.";
      return;
    }

    products.forEach(function (product) {
      const card = document.createElement("div");
      card.className = "seller-inventory-item";

      const name = document.createElement("h3");
      name.textContent = product.name;

      const price = document.createElement("p");
      price.textContent = "Price: ₦" + Number(product.price).toLocaleString();

      const category = document.createElement("p");
      category.textContent = "Category: " + product.category;

      const status = document.createElement("p");
      status.textContent = product.is_available
        ? "Status: Available"
        : "Status: Unavailable";

      const availabilityButton = document.createElement("button");
availabilityButton.type = "button";
availabilityButton.textContent = product.is_available
  ? "Mark Unavailable"
  : "Mark Available";
      availabilityButton.addEventListener("click", function () {
  toggleSellerProductAvailability(product.id, product.is_available);
});
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit Product";

      editButton.addEventListener("click", function () {
        const newName = prompt("Enter product name:", product.name);
        if (newName === null || !newName.trim()) return;

        const newPrice = prompt("Enter product price:", product.price);
        if (newPrice === null) return;

        const priceNumber = Number(newPrice);

        if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
          alert("Please enter a valid price greater than zero.");
          return;
        }

        const newCategory = prompt("Enter product category:", product.category);
        if (newCategory === null || !newCategory.trim()) return;

        const newDescription = prompt(
          "Enter product description:",
          product.description || ""
        );
        if (newDescription === null) return;

        saveSellerProductEdit(
          product.id,
          newName.trim(),
          priceNumber,
          newCategory.trim(),
          newDescription.trim()
        );
      });

      card.append(name, price, category, status, availabilityButton, editButton);
      list.appendChild(card);

    });

    message.textContent = products.length + " product(s) found.";
  } catch (error) {
    console.error("Seller inventory error:", error);
    message.textContent = "Could not load products: " + error.message;
  }
}

const inventoryRefreshButton =
  document.getElementById("refresh-seller-inventory");

if (inventoryRefreshButton) {
  inventoryRefreshButton.addEventListener("click", loadSellerInventory);
}


async function toggleSellerProductAvailability(id, isAvailable) {
  const message = document.getElementById("seller-inventory-message");

  message.textContent = "Updating product availability...";

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError) throw userError;
    if (!userData.user) throw new Error("Please log in first.");

    const { data, error } = await supabaseClient
      .from("products")
      .update({ is_available: !isAvailable })
      .eq("id", id)
      .eq("seller_id", userData.user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("Product availability was not updated. Check seller permissions.");
    }

    message.textContent = "Product availability updated successfully!";
    await loadSellerInventory();
    await loadProducts();

  } catch (error) {
    console.error("Availability update error:", error);
    message.textContent = "Could not update availability: " + error.message;
  }
}

async function saveSellerProductEdit(id, name, price, category, description) {
  const message = document.getElementById("seller-inventory-message");

  message.textContent = "Saving product changes...";

  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError) throw userError;
    if (!userData.user) throw new Error("Please log in first.");

    const { data, error } = await supabaseClient
      .from("products")
      .update({
        name,
        price,
        category,
        description
      })
      .eq("id", id)
      .eq("seller_id", userData.user.id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("Product not updated. Please check your seller permissions.");
    }

    message.textContent = "Product updated successfully!";
    await loadSellerInventory();
    await loadProducts();

  } catch (error) {
    console.error("Product edit error:", error);
    message.textContent = "Could not update product: " + error.message;
  }
}

// Allzy Market: Customer Order Tracking

const trackOrderForm = document.getElementById("track-order-form");
const trackingResult = document.getElementById("tracking-result");

if (trackOrderForm && trackingResult) {
  trackOrderForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const orderId = document
      .getElementById("tracking-order-id")
      .value.trim();

    const phone = document
      .getElementById("tracking-phone")
      .value.trim();

    trackingResult.textContent = "Checking your order...";

    try {
      const response = await fetch(
        "https://xdmuygtrzqznbywvzypl.supabase.co/functions/v1/track-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY
          },
          body: JSON.stringify({ orderId, phone })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        trackingResult.textContent =
          result.error || "Unable to find your order. Please check your details.";
        return;
      }

      const safeStatus = String(result.status || "Pending")
        .replace(/[&<>"']/g, character => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[character]);

      
      const status = String(result.status || "pending").toLowerCase();

      const steps = [
        { label: "Order Placed", icon: "1", statuses: ["pending", "confirmed", "shipped", "delivered"] },
        { label: "Confirmed", icon: "2", statuses: ["confirmed", "shipped", "delivered"] },
        { label: "Shipped", icon: "3", statuses: ["shipped", "delivered"] },
        { label: "Delivered", icon: "4", statuses: ["delivered"] }
      ];

      const statusOrder = ["pending", "confirmed", "shipped", "delivered"];
      const currentIndex = statusOrder.indexOf(status);

      const journey = status === "cancelled"
        ? `<p class="tracking-status-message">This order has been cancelled.</p>`
        : `
          <div class="tracking-journey">
            <div class="tracking-steps">
              ${steps.map((step, index) => {
                const completed = step.statuses.includes(status);
                const current = index === currentIndex;

                return `
                  <div class="tracking-step ${completed ? "completed" : ""} ${current ? "current" : ""}">
                    <div class="tracking-icon">${completed ? "✓" : step.icon}</div>
                    <div>${step.label}</div>
                  </div>
                `;
              }).join("")}
            </div>
            <p class="tracking-status-message">Current status: ${safeStatus}</p>
          </div>
        `;

      trackingResult.innerHTML = `
        <h3>Order #${Number(result.orderId)}</h3>
        ${journey}
        <p><strong>Order Date:</strong> ${
          result.createdAt
            ? new Date(result.createdAt).toLocaleDateString()
            : "Not available"
        }</p>
      `;

    } catch (error) {
      console.error("Order tracking error:", error);
      trackingResult.textContent =
        "Unable to check your order right now. Please try again later.";
    }
  });
}


// Allzy Market - Customer Registration and Login

const customerSignupForm =
  document.getElementById("customer-signup-form");

const customerLoginForm =
  document.getElementById("customer-login-form");

const customerLogoutButton =
  document.getElementById("customer-logout-button");

const customerAccountMessage =
  document.getElementById("customer-account-message");

async function updateCustomerAccountStatus() {
  if (customerPasswordRecoveryActive) return;

  const { data, error } = await supabaseClient.auth.getUser();

  if (customerPasswordRecoveryActive) return;

  const customerDashboard = document.getElementById(
    "customer-dashboard"
  );

  if (
    error ||
    !data.user ||
    data.user.user_metadata?.account_type !== "customer"
  ) {
if (customerSignupForm) customerSignupForm.hidden = false;
if (customerLoginForm) customerLoginForm.hidden = false;
if (customerLogoutButton) customerLogoutButton.hidden = true;

    if (customerDashboard) {
      customerDashboard.hidden = true;
    }

    return;
  }

  const user = data.user;

  customerSignupForm.hidden = true;
  customerLoginForm.hidden = true;
  customerLogoutButton.hidden = false;

  const customerName =
    user.user_metadata?.full_name || user.email;

  customerAccountMessage.textContent =
    "Welcome, " + customerName + "! You are logged in.";

  if (customerDashboard) {
    customerDashboard.hidden = false;

    document.getElementById("customer-dashboard-name").textContent =
      "Name: " + customerName;

    document.getElementById("customer-dashboard-email").textContent =
      "Email: " + user.email;
  }
}

// Customer registration
if (customerSignupForm) {
  customerSignupForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name =
      document.getElementById("customer-signup-name").value.trim();

    const email =
      document.getElementById("customer-signup-email").value.trim();

    const password =
      document.getElementById("customer-signup-password").value;

    customerAccountMessage.textContent = "Creating your account...";

    const button = customerSignupForm.querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;

    try {
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

      if (error) throw error;

      if (data.session) {
        customerAccountMessage.textContent =
          "Account created successfully! Welcome to Allzy Market.";

        customerSignupForm.reset();
        await updateCustomerAccountStatus();
      } else {
        customerAccountMessage.textContent =
          "Account created! Please check your email to confirm your account before logging in.";

        customerSignupForm.reset();
      }

    } catch (error) {
      customerAccountMessage.textContent =
        "Registration failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// Customer login
if (customerLoginForm) {
  customerLoginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email =
      document.getElementById("customer-login-email").value.trim();

    const password =
      document.getElementById("customer-login-password").value;

    customerAccountMessage.textContent = "Logging in...";

    const button = customerLoginForm.querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      customerLoginForm.reset();

      await updateCustomerAccountStatus();

    } catch (error) {
      customerAccountMessage.textContent =
        "Login failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// Customer logout
if (customerLogoutButton) {
  customerLogoutButton.addEventListener("click", async function() {
    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) throw error;

      customerAccountMessage.textContent =
        "You have logged out successfully.";

      await updateCustomerAccountStatus();

    } catch (error) {
      customerAccountMessage.textContent =
        "Logout failed: " + error.message;
    }
  });
}

// Allzy Market - Customer Password Recovery

const customerResetForm = document.getElementById(
  "customer-reset-password-form"
);

const customerForgotPasswordForm = document.getElementById(
  "customer-forgot-password-form"
);

// Request password recovery email
if (customerForgotPasswordForm) {
  customerForgotPasswordForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById(
      "customer-recovery-email"
    ).value.trim();

    const button = customerForgotPasswordForm.querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;
    customerAccountMessage.textContent = "Sending reset link...";

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin + window.location.pathname
        }
      );

      if (error) throw error;

      customerAccountMessage.textContent =
        "If an account exists for this email, a password reset link will be sent.";

      customerForgotPasswordForm.reset();

    } catch (error) {
      customerAccountMessage.textContent =
        "Request failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// Detect password recovery
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    customerPasswordRecoveryActive = true;

    if (customerSignupForm) customerSignupForm.hidden = true;
    if (customerLoginForm) customerLoginForm.hidden = true;
    if (customerLogoutButton) customerLogoutButton.hidden = true;
    if (customerForgotPasswordForm) customerForgotPasswordForm.hidden = true;

    if (customerResetForm) {
      customerResetForm.hidden = false;
    }

    if (customerAccountMessage) {
      customerAccountMessage.textContent =
        "Enter your new password below.";
    }
  }
});

// Check customer login after recovery listener is ready
if (customerSignupForm && customerLoginForm) {
  updateCustomerAccountStatus();
}
// Save new password
if (customerResetForm) {
  customerResetForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const newPassword = document.getElementById(
      "customer-new-password"
    ).value;

    const button = customerResetForm.querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;
    customerAccountMessage.textContent = "Updating your password...";

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      customerResetForm.reset();
      customerResetForm.hidden = true;

      customerPasswordRecoveryActive = false;

if (customerForgotPasswordForm) {
  customerForgotPasswordForm.hidden = false;
}

customerAccountMessage.textContent =
  "Your password has been updated successfully.";

      await updateCustomerAccountStatus();
    } catch (error) {
      customerAccountMessage.textContent =
        "Password update failed: " + error.message;
    } finally {
      button.disabled = false;
    }
  });
}
