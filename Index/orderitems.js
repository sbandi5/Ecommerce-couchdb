import ApiCalls from '../server/ApiCalls.js';
import checkAuthenticated from '../server/checkAuthenticated.js';
const API = new ApiCalls();
const checkAuth = new checkAuthenticated();
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth.check();
    const ordersContainer = document.getElementById('orders-container');

    try {
        const response = await fetch(API.orderedItems, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Ensure session data is included
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        const { orderedItems } = data;

        if (orderedItems.length === 0) {
            ordersContainer.innerHTML = '<p>You have not placed any orders yet.</p>';
            return;
        }

        // Render orders
        ordersContainer.innerHTML = '';
        let currentOrderID = null;
        orderedItems.forEach((order) => {
            if (order.OrderID !== currentOrderID) {
                currentOrderID = order.OrderID;

                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';

                orderCard.innerHTML = `
                    <div class="order-header">
                        <h3>Order ID: ${order.OrderID}</h3>
                        <p>${new Date(order.OrderDate).toLocaleDateString()}</p>
                    </div>
                    <ul class="order-items" id="order-items-${order.OrderID}"></ul>
                    <p class="total-amount">Total: $${order.TotalAmount}</p>
                `;

                ordersContainer.appendChild(orderCard);
            }

            const orderItemsContainer = document.getElementById(`order-items-${order.OrderID}`);
            const orderItem = document.createElement('li');

            const imageUrl = order.ImageURLs ? order.ImageURLs.split(',')[0] : 'default-image-path.jpg';
            console.log(imageUrl);
            orderItem.innerHTML = `
                <img src="${'../'+imageUrl}" alt="${order.Name}">
                <div>
                    <p>${order.Name}</p>
                    <p>${order.Quantity} x $${order.Price}</p>
                </div>
            `;

            orderItemsContainer.appendChild(orderItem);
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersContainer.innerHTML = '<p>Failed to load orders. Please try again later.</p>';
    }
});
