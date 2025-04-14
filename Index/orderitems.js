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
        console.log('Ordered Items:', orderedItems);

        if (orderedItems.length === 0) {
            ordersContainer.innerHTML = '<p>You have not placed any orders yet.</p>';
            return;
        }

        // Render orders
        ordersContainer.innerHTML = '';
        let currentOrderID = null;
        orderedItems.forEach((order) => {
            if (order.orderId !== currentOrderID) {
                currentOrderID = order.orderId;

                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';

                orderCard.innerHTML = `
                    <div class="order-header">
                        <h3>Order ID: ${order.orderId}</h3>
                        <p>${new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <ul class="order-items" id="order-items-${order.orderId}"></ul>
                    <p class="total-amount">Total: $${order.totalAmount}</p>
                `;

                ordersContainer.appendChild(orderCard);
            }

            const orderItemsContainer = document.getElementById(`order-items-${order.orderId}`);
            const orderItem = document.createElement('li');
            const items = order.items[0]; // Access first item in the array

            const imageUrl = items.imageURLs ? items.imageURLs[0] : 'default-image-path.jpg';
            console.log(imageUrl);
            orderItem.innerHTML = `
                <img src="${'../'+imageUrl}" alt="${items.name}" style="width: 100px; height: 100px; object-fit: cover;">
                <div>
                    <p>${items.name}</p>
                    <p>${items.quantity} x $${items.price}</p>
                </div>
            `;

            orderItemsContainer.appendChild(orderItem);
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersContainer.innerHTML = '<p>Failed to load orders. Please try again later.</p>';
    }
});
