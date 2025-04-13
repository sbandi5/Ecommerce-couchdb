import ApiCalls from "../server/ApiCalls.js";
import AuthCheck from '../server/checkAuthenticated.js';
const Apis = new ApiCalls();
const checkAuthenticated = new AuthCheck();

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuthenticated.check();
  const itemsContainer = document.getElementById("items-container");

  // Fetch items from an API
  fetch(Apis.items, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
    .then((response) => {
      if (response.status === 401) {
        // If unauthorized, redirect to the login page
        window.location.href = "../Login/login.html";
        return Promise.reject("Unauthorized. Redirecting to login.");
      }
      return response.json();
    })
    .then((items) => {
      items.forEach((item) => {
        const itemCard = document.createElement("div");
        itemCard.className = "item-card";

        // Construct Image URL dynamically
        const imageUrl = item.ImageURLs && item.ImageURLs.length > 0 ? "../" + item.ImageURLs[0] : "default-image-path.jpg";

        // Dynamically add item content
        itemCard.innerHTML = `
          <img src="${imageUrl}" alt="${item.Name}">
          <div class="item-info">
            <h3 class="item-name">${item.Name}</h3>
            <p class="item-price">$${item.Price}</p>
            <p class="item-type">${item.Type} Shoes</p>
          </div>
        `;

        // Add click event listener dynamically
        itemCard.querySelector("img").addEventListener("click", () => {
          redirectToProductPage(item);
        });

        // // Corrected class name for Add to Cart
        // itemCard.querySelector('.AddToCart').addEventListener('click', () => {
        //   addToCart(item);
        // });

        itemsContainer.appendChild(itemCard);
      });
    })
    .catch((error) => {
      console.error("Error fetching items:", error);
      if (error !== "Unauthorized. Redirecting to login.") {
        itemsContainer.innerHTML =
          '<p>Failed to load items. Please try again later.</p>';
      }
    });
});

// Function to handle product redirection
function redirectToProductPage(item) {
  item.ItemID = item._id; // Add this line
  localStorage.setItem("selectedProduct", JSON.stringify(item));
  window.location.href = "product.html";
}


// Function to add item to cart
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
