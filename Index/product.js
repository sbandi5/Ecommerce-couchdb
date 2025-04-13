import ApiCalls from "../server/ApiCalls.js"; 
import checkAuthenticated from "../server/checkAuthenticated.js";
const Apis = new ApiCalls();
const checkAuth = new checkAuthenticated();

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth.check();
});

const productDetails = JSON.parse(localStorage.getItem("selectedProduct"));
if (!productDetails) {
  alert("Product details not available. Redirecting to the homepage...");
  window.location.href = "index.html";
}

const currentProductId = productDetails?.ItemID || null;
const socket = io(Apis.getUrl());

function setupSocket() {
  if (socket) {
    console.log("Connected to Socket.IO server.");

    // Listen for stock updates
    socket.on("stock-update", (itemsStock) => {
      console.log("Stock updated:", itemsStock);
      console.log("Current product ID:", currentProductId);
      const productStock = itemsStock[currentProductId];
      if (productStock) {
        updateStockUI(productStock.stock); // Update the UI dynamically
      }
    });

    // Handle stock errors
    socket.on("stock-error", (error) => {
      console.error("Stock error:", error.message);
      alert(error.message);
    });
  } else {
    console.error("Failed to connect to the server. Please check your network.");
  }
}

setupSocket();

// Update stock UI
function updateStockUI(stock) {
  const addToCartBtn = document.getElementById("AddToCart");
  const stockHeader = document.getElementById("stock-header");
  const stockElement = document.getElementById("product-stock");

  if (stockElement) stockElement.innerText = stock;

  if (stock <= 0) {
    addToCartBtn.style.display = "none";
    stockHeader.innerText = "Out of Stock";
    stockHeader.style.color = "red";
  } else if (stock < 10) {
    stockHeader.innerText = `Hurry! Only ${stock} items left in stock.`;
    addToCartBtn.style.display = "inline-block";
    stockHeader.style.color = "orange";
  } else {
    stockHeader.innerText = `In Stock (${stock} items available).`;
    addToCartBtn.style.display = "inline-block";
    stockHeader.style.color = "green";
  }
}

function populateProductDetails(details) {
  document.getElementById("product-name").innerText = details.Name;
  document.getElementById("product-price").innerText = `$${details.Price}`;
  document.getElementById("product-description").innerText =
    details.Description || "No description available.";
  document.getElementById("product-offer").innerText =
    details.Offer || "No offers available.";
  document.getElementById("delivery-date").innerText =
    details.DeliveryDate || "3-5 Business Days";

  const mainImage = document.getElementById("main-product-img");
  const thumbnailGallery = document.getElementById("thumbnail-gallery");
  thumbnailGallery.innerHTML = ""; // Clear existing thumbnails

  details.ImageURLs?.forEach((url) => {
    const imgPath = "../" + url;
    console.log(imgPath);
    const thumbnail = document.createElement("img");
    thumbnail.src = imgPath;
    thumbnail.addEventListener("click", () => {
      mainImage.src = imgPath;
    });
    thumbnailGallery.appendChild(thumbnail);
  });

  const specsContainer = document.getElementById("product-specs");
  specsContainer.innerHTML = ""; // Clear existing specs
  if (details.Specifications) {
    Object.entries(details.Specifications).forEach(([key, value]) => {
      const specItem = document.createElement("p");
      specItem.innerHTML = `<strong>${key}:</strong> ${value}`;
      specsContainer.appendChild(specItem);
    });
  }

  const reviewsContainer = document.getElementById("reviews-container");
  reviewsContainer.innerHTML = ""; // Clear existing content
  if (details.Reviews && details.Reviews.length) {
    reviewsContainer.innerHTML = `<h4>${details.Reviews.length} Reviews</h4>`;
    details.Reviews.forEach((review) => {
      const reviewItem = document.createElement("div");
      reviewItem.innerHTML = `<p>${review}</p>`;
      reviewsContainer.appendChild(reviewItem);
    });
  } else {
    reviewsContainer.innerHTML = `<p>No reviews yet. Be the first to review!</p>`;
  }
}

if (productDetails) {
  populateProductDetails(productDetails);
}

document.querySelector('.AddToCart').addEventListener('click', () => {
  addToCart(productDetails);
});

async function addToCart(item) {
  try {
    const response = await fetch(Apis.addtocart, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ item }), // Wrap the item object in an `item` property
    });

    const result = await response.json(); // Parse the JSON response

    if (response.ok && result.success) {
      alert('Item added to cart');
    } else {
      console.error('Failed to add item to cart:', result.message);
      alert(result.message || 'Failed to add item to cart.');
    }
  } catch (error) {
    console.error('Error adding item to cart:', error);
    alert('An error occurred. Please try again later.');
  }
}

