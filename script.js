const SUPABASE_URL = "https://xdmuygtrzqznbywvzypl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UGRcI_2l6Vpl7QroGTVFiw_J818DtOC";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let allProducts = [];

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
          alt="${product.name}"
          style="width:100%;max-width:300px;height:250px;object-fit:contain;"
        >
      ` : ""}

      <h3>${product.name}</h3>
      <p>${product.description || ""}</p>
      <p>₦${Number(product.price).toLocaleString("en-NG")}</p>

      <button
        type="button"
        class="add-to-cart"
        data-index="${index}"
      >
        Add to Cart
      </button>
    </article>
  `).join("");

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
}

const searchInput = document.getElementById("product-search");
const categorySelect = document.getElementById("product-category");

function filterProducts() {
  const searchTerm = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const selectedCategory = categorySelect
    ? categorySelect.value.toLowerCase()
    : "";

  const filteredProducts = allProducts.filter(product => {
    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchTerm) ||
      (product.description || "").toLowerCase().includes(searchTerm) ||
      (product.category || "").toLowerCase().includes(searchTerm);

    const matchesCategory =
      !selectedCategory ||
      (product.category || "").toLowerCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  renderProducts(filteredProducts);
}

if (searchInput) {
  searchInput.addEventListener("input", filterProducts);
}

if (categorySelect) {
  categorySelect.addEventListener("change", filterProducts);
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
