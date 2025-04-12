import APIS from '../server/ApiCalls.js';
const API = new APIS();
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const headerNav = document.getElementById('header-nav');
  const searchForm = document.getElementById('search-form');
  const cartIcon = document.getElementById('cart-icon');
  const accountIcon = document.getElementById('account-icon');
  const accountDropdown = document.getElementById('account-dropdown');
  const MainLogo = document.querySelector('.header-LogoImg'); // Select the first matching element
  if (MainLogo) {
    MainLogo.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Toggle dropdown visibility on click
  accountIcon.addEventListener('click', () => {
    accountDropdown.style.display =
      accountDropdown.style.display === 'block' ? 'none' : 'block';
  });

  // Close dropdown if clicked outside
  document.addEventListener('click', (event) => {
    if (!accountIcon.contains(event.target) && !accountDropdown.contains(event.target)) {
      accountDropdown.style.display = 'none';
    }
  });

  // Event listeners for dropdown items
  document.getElementById('user-details').addEventListener('click', () => {
    window.location.href = 'profile.html';
  });
  document.getElementById('ordered-items').addEventListener('click', () => {
    window.location.href = './orderitems.html';
  });
  document.getElementById('Manage-items').addEventListener('click', () => {
    window.location.href = 'manageItems.html';
  });
  document.getElementById('favourites').addEventListener('click', () => {
    alert('Navigating to Favourites...');
  });

  document.getElementById('logout').addEventListener('click', async () => {
    try {
      const response = await fetch(API.logout, {
        method: 'POST',
        credentials: 'include', // Include cookies for session-based authentication
      });
  
      const result = await response.json();
  
      if (result.success) {
        alert(result.message); // Notify the user
        window.location.href = '../Login/login.html'; // Redirect to the login page
      } else {
        alert('Logout failed: ' + result.message); // Show error message
      }
    } catch (error) {
      console.error('Error during logout:', error);
      alert('An error occurred while logging out.');
    }
  });
  

  // Toggle navigation menu
  menuToggle.addEventListener('click', () => {
    headerNav.classList.toggle('open');
  });

  // Handle search form submission
  // Handle search form submission
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const searchQuery = new FormData(searchForm).get('search').trim();
  console.log('Search query:', searchQuery);

  if (searchQuery) {
    // Save the query to localStorage
    localStorage.setItem('searchQuery', searchQuery);

    // Redirect to SearchResults.html
    window.location.href = 'SearchResults.html';
  } else {
    alert("Please enter a valid search term.");
  }
});


  // Handle cart icon click
  cartIcon.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
});


document.getElementById('navigation-menu').addEventListener('click', function (event) {
  const clickedItem = event.target;

  // Check if the clicked element is a list item (LI)
  if (clickedItem.tagName === 'LI') {
    const type = clickedItem.id;

    if (type === 'Home') {
      window.location.href = './index.html';
    } else {
      // Fetch and display items based on the selected type
      GetItembyType(type);
    }
  }
});
function GetItembyType(type) {
  const itemsContainer = document.getElementById('items-container');

  fetch(API.items)
    .then(response => response.json())
    .then(items => {
      // Filter items by type
      const filteredItems = items.filter(item => item.Type === type);

      // Clear existing items
      itemsContainer.innerHTML = '';

      // Use DocumentFragment for performance
      const fragment = document.createDocumentFragment();

      filteredItems.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';

        // Securely store item data
        itemCard.dataset.item = JSON.stringify(item);
        const imageUrl = item.ImageURLs && item.ImageURLs.length > 0 ? "../" + item.ImageURLs[0] : "default-image-path.jpg";


        // Populate card content
        itemCard.innerHTML = `
          <img src="${imageUrl}" 
               alt="${item.Name}" 
               class="item-image">
          <div class="item-info">
            <h3 class="item-name">${item.Name}</h3>
            <p class="item-price">$${item.Price}</p>
            <p class="item-type">${item.Type} Shoes</p>
          </div>
        `;
        itemCard.querySelector("img").addEventListener("click", () => {
          redirectToProductPage(item);
        });

        // itemCard.querySelector('.AddToCart').addEventListener('click', () => {
        //   addToCart(item);
        // });
        fragment.appendChild(itemCard);
      });
      
      // Append all cards to the container
      itemsContainer.appendChild(fragment);

      // Add event listeners for view details
      attachViewDetailsHandler();
    })
    .catch(error => console.error('Error fetching items:', error));
}

// Function to handle "View Details" button click
function attachViewDetailsHandler() {
  const detailsButtons = document.querySelectorAll('.view-details-btn');
  detailsButtons.forEach(button => {
    button.addEventListener('click', function () {
      const itemCard = button.closest('.item-card');
      const itemData = JSON.parse(itemCard.dataset.item);
      showItemDetails(itemData);
    });
  });
}

function redirectToProductPage(item) {
  // Store the item in localStorage
  localStorage.setItem("selectedProduct", JSON.stringify(item));

  // Redirect to product.html
  window.location.href = "product.html";
}

// Function to add item to cart
async function addToCart(item) {
  try {
    const response = await fetch(API.addtocart, {
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
