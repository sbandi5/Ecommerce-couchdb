import ApiCalls from '../server/ApiCalls.js';
const API = new ApiCalls();
document.addEventListener('DOMContentLoaded', () => {
    const searchQuery = localStorage.getItem('searchQuery');
    const itemsContainer = document.getElementById('items-container');
  
    if (!searchQuery) {
      itemsContainer.innerHTML = '<p class="error-message">No search query provided. Please return to the home page.</p>';
      return;
    }
  
    // Fetch and display items
    fetch(API.items)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch items: ${response.statusText}`);
        }
        return response.json();
      })
      .then(items => {
        // Filter items based on the search query
        const filteredItems = items.filter(item =>
          item.Type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.Description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        console.log(filteredItems);
  
        // Clear container and populate results
        itemsContainer.innerHTML = '';
  
        if (filteredItems.length === 0) {
          itemsContainer.innerHTML = '<p class="no-results-message">No results found for your search.</p>';
          return;
        }
  
        const fragment = document.createDocumentFragment();
  
        filteredItems.forEach(item => {
          const itemCard = document.createElement('div');
          itemCard.className = 'item-card';
          itemCard.dataset.item = JSON.stringify(item);
  
          const imageUrl = item.ImageURLs && item.ImageURLs.length > 0
            ? `../${item.ImageURLs[0]}`
            : 'default-image-path.jpg';
  
          itemCard.innerHTML = `
            <img src="${imageUrl}" alt="${item.Name}" class="item-image">
            <div class="item-info">
              <h3 class="item-name">${item.Name}</h3>
              <p class="item-price">$${item.Price}</p>
              <p class="item-type">${item.Type} Shoes</p>
              <button class="AddToCart">Add to Cart</button>
            </div>
          `;
  
          itemCard.querySelector('img').addEventListener('click', () => {
            redirectToProductPage(item);
          });
  
          itemCard.querySelector('.AddToCart').addEventListener('click', () => {
            addToCart(item);
          });
  
          fragment.appendChild(itemCard);
        });
  
        itemsContainer.appendChild(fragment);
      })
      .catch(error => {
        console.error('Error fetching items:', error);
        itemsContainer.innerHTML = '<p class="error-message">Failed to load search results. Please try again later.</p>';
      });
  });
  
  // Redirect to product details page
  function redirectToProductPage(item) {
    localStorage.setItem('selectedProduct', JSON.stringify(item));
    window.location.href = 'product.html';
  }
  
  // Add item to cart
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
  
  