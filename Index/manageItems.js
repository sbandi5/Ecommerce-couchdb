import ApiCalls from '../server/ApiCalls.js';
import checkAuthenticated from '../server/checkAuthenticated.js';
const API = new ApiCalls();
const checkAuth = new checkAuthenticated();


document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth.check();
    fetchItems();

});
// Fetch and display items
async function fetchItems() {
    const itemList = document.getElementById('itemList');
    itemList.innerHTML = '<p>Loading items...</p>';
    try {
        const response = await fetch(API.addItems1, {
            method: "GET", // Changed to GET for fetching data
            headers: { "Content-Type": "application/json" },
            credentials: "include", // Ensure cookies are included in the request
        });
        const results = await response.json();
        const {items} = results;
        if (items.length === 0) {
            itemList.innerHTML = '<p>No items available. Create a new one!</p>';
            return;
        }

        itemList.innerHTML = '';
        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = `item-card ${item.status === 'sold' ? 'sold' : ''}`;
            itemCard.innerHTML = `
                <h3>${item.Name}</h3>
                <p>${item.Description}</p>
                <p><strong>Price:</strong> $${item.Price}</p>
                <p><strong>Status:</strong> ${item.status === 'sold' ? 'Sold' : 'Available'}</p>
                ${item.status === 'sold' ? `
                <div class="buyer-details">
                    <h4>Buyer Details</h4>
                    <p><strong>Name:</strong> ${item.buyer.name}</p>
                    <p><strong>Address:</strong> ${item.buyer.address}</p>
                    <p><strong>Phone:</strong> ${item.buyer.phone}</p>
                    <p><strong>Email:</strong> ${item.buyer.email}</p>
                </div>` : ''}
            `;
            itemList.appendChild(itemCard);
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        itemList.innerHTML = '<p>Failed to load items. Try again later.</p>';
    }
}

// Handle item creation
document.getElementById('createItemForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
        const response = await fetch(API.addItems, {
            method: 'POST',
            body: formData, // Send the form data directly
            credentials: 'include'
        });

        if (response.ok) {
            alert('Item created successfully!');
            event.target.reset();
            fetchItems(); // Refresh the item list
        } else {
            alert('Failed to create item.');
        }
    } catch (error) {
        console.error('Error creating item:', error);
        alert('Error occurred. Please try again.');
    }
});


