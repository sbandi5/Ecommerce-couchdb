import { createCheckoutSession } from './payment.js';
import ApiCalls from '../server/ApiCalls.js';
import checkAuthenticated from '../server/checkAuthenticated.js';

const checkAuth = new checkAuthenticated();
const Apis = new ApiCalls();

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth.check();
    const user = await fetchUserDetails();
    const cartContainer = document.getElementById("cart-container");
    cartContainer.innerHTML = '<p>Loading cart items...</p>';

    try {
        const cartResponse = await fetch(Apis.cart, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!cartResponse.ok) throw new Error("Failed to fetch cart items.");

        const { cartItems } = await cartResponse.json();

        if (!cartItems.length) {
            cartContainer.innerHTML = '<p>Your cart is empty.</p>';
            return;
        }

        cartContainer.innerHTML = '';
        cartItems.forEach(item => {
            const itemCard = document.createElement("div");
            itemCard.className = "cart-item-card";

            const images = item.ImageURLs.split(',');
            const imageUrl = item.ImageURLs?.length ? `../${images[0]}` : "default-image-path.jpg";

            itemCard.innerHTML = `
                <img src="${imageUrl}" alt="${item.Name}">
                <div class="item-info">
                    <h3>${item.Name}</h3>
                    <p>${item.Description}</p>
                    <p><strong>Price:</strong> $${item.Price}</p>
                    <p><strong>Stock:</strong> ${item.Stock}</p>
                    <div class="quantity-controls">
                        <button class="decrease-quantity" data-item-id="${item.ItemID}">-</button>
                        <input type="number" value="${item.Quantity}" min="1" max="${Math.min(5, item.Stock)}" data-item-id="${item.ItemID}">
                        <button class="increase-quantity" data-item-id="${item.ItemID}">+</button>
                    </div>
                    <button class="remove-from-cart" data-item-id="${item.ItemID}">Remove</button>
                </div>
            `;

            // Attach event listeners for quantity controls
            itemCard.querySelector('.increase-quantity').addEventListener('click', () => updateQuantity(item.ItemID, 1, item.Stock));
            itemCard.querySelector('.decrease-quantity').addEventListener('click', () => updateQuantity(item.ItemID, -1, item.Stock));
            itemCard.querySelector('.remove-from-cart').addEventListener('click', () => removeFromCart(item.ItemID));

            cartContainer.appendChild(itemCard);
        });
    } catch (error) {
        console.error("Error fetching cart items:", error);
        cartContainer.innerHTML = '<p>Failed to load cart. Please try again later.</p>';
    }
});

async function fetchUserDetails() {
    try {
        const response = await fetch(Apis.userDetails, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch user details.");

        const user = await response.json();
        const userDetails = user.user;

        // Update the shipping address element
        document.getElementById("shipping-address").innerText = `${userDetails.aptAddress},\n ${userDetails.street},\n ${userDetails.city},\n ${userDetails.state},\n ${userDetails.areaCode}.`;

        return user;
    } catch (error) {
        console.error("Error fetching user details:", error);
        throw new Error("Unable to fetch user details. Please log in again.");
    }
}

async function updateQuantity(itemId, delta, maxStock) {
    const inputField = document.querySelector(`input[data-item-id="${itemId}"]`);
    const currentQuantity = parseInt(inputField.value, 10);
    const newQuantity = currentQuantity + delta;

    // Ensure the quantity is within the allowed range
    if (newQuantity < 1 || newQuantity > Math.min(5, maxStock)) {
        alert(`Quantity must be between 1 and ${Math.min(5, maxStock)}.`);
        return;
    }

    try {
        const response = await fetch(Apis.updatecart, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ itemId, quantity: newQuantity }),
        });

        const result = await response.json(); // Parse the response JSON

        if (!response.ok) {
            // If the response is not OK, display the backend error message
            throw new Error(result.message || "Failed to update quantity.");
        }

        inputField.value = newQuantity;
        alert(result.message || "Quantity updated successfully.");
    } catch (error) {
        console.error("Error updating quantity:", error);
        // Display the error message from the backend
        alert(error.message || "Failed to update quantity. Please try again later.");
    }
}


async function removeFromCart(itemId) {
    try {
        const response = await fetch(Apis.removecart, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ itemId }),
        });

        if (!response.ok) throw new Error("Failed to remove item from cart.");

        alert("Item removed from cart.");
        location.reload();
    } catch (error) {
        console.error("Error removing item from cart:", error);
        alert("Failed to remove item from cart. Please try again later.");
    }
}
document.querySelector('.checkout_button').addEventListener('click', async () => {
    try {
        const cartResponse = await fetch(Apis.cart, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });

        if (!cartResponse.ok) throw new Error("Failed to fetch cart items.");

        const { user, cartItems } = await cartResponse.json();

// Store user details in local storage
if (user) {
    localStorage.setItem('userDetails', JSON.stringify(user));
    console.log('User details stored in localStorage:', user);
} else {
    console.warn('User details are missing.');
}


        if (!user?.id) {
            alert("User information is missing. Please log in again.");
            return;
        }

        if (!cartItems.length) {
            alert("Your cart is empty. Add items to proceed to checkout.");
            return;
        }

        const cartItemsWithTax = [
            ...cartItems.map(item => ({
                Name: item.Name,
                Price: item.Price,
                Quantity: item.Quantity,
            })),
        ];

        const checkoutResponse = await fetch(Apis.payment, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cartItems: cartItemsWithTax, userId: user.id }),
        });

        if (!checkoutResponse.ok) throw new Error("Failed to create a checkout session.");

        const { sessionId } = await checkoutResponse.json();

        const stripe = Stripe('pk_test_51QSMF0D5Kjv0FeJleVhmcBlvHyrv58ND0ysVXae0NEdN5xXrLut9DlSUSJtZrQV730Z7rWLMdBNsf7eVwmiXaltw006h4Vyev4');
        const result = await stripe.redirectToCheckout({ sessionId });

        if (result.error) {
            console.error(result.error.message);
            alert("Failed to redirect to checkout. Please try again.");
        }
    } catch (error) {
        console.error("Error during Stripe checkout:", error);
        alert("Checkout failed. Please try again later.");
    }
});
