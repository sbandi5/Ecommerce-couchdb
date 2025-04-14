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
        console.log(cartItems);

        if (cartItems === undefined) {
            cartContainer.innerHTML = '<p>Your cart is empty.</p>';
            return;
        }

        cartContainer.innerHTML = '';
        cartItems.forEach(item => {
            const itemCard = document.createElement("div");
            itemCard.className = "cart-item-card";

            const images = item.imageURLs?.[0] ? item.imageURLs : ["default-image-path.jpg"];
            const imageUrl = `../${images[0]}`;


            itemCard.innerHTML = `
                <img src="${imageUrl}" alt="${item.name}">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <p><strong>Price:</strong> $${item.price}</p>
                    <p><strong>Stock:</strong> ${item.stock}</p>
                    <div class="quantity-controls">
                        <button class="decrease-quantity" data-item-id="${item.itemId}">-</button>
                        <input type="number" value="${item.quantity}" min="1" max="${Math.min(5, item.stock)}" data-item-id="${item.itemId}">
                        <button class="increase-quantity" data-item-id="${item.itemId}">+</button>
                    </div>
                    <button class="remove-from-cart" data-item-id="${item.itemId}">Remove</button>
                </div>
            `;

            // Attach event listeners for quantity controls
            itemCard.querySelector('.increase-quantity').addEventListener('click', () => updateQuantity(item.itemId, 1, item.stock));
            itemCard.querySelector('.decrease-quantity').addEventListener('click', () => updateQuantity(item.itemId, -1, item.stock));
            itemCard.querySelector('.remove-from-cart').addEventListener('click', () => removeFromCart(item.itemId));

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
        document.getElementById("shipping-address").innerText = `${userDetails.address.aptAddress},\n ${userDetails.address.street},\n ${userDetails.address.city},\n ${userDetails.address.state},\n ${userDetails.address.areaCode}.`;

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

        if (!user.username) {
            alert("User information is missing. Please log in again.");
            return;
        }

        if (!cartItems.length) {
            alert("Your cart is empty. Add items to proceed to checkout.");
            return;
        }

        const cartItemsWithTax = [
            ...cartItems.map(item => ({
                Name: item.name,
                Price: item.price,
                Quantity: item.quantity,
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

        const stripe = Stripe('pk_test_51RDXoyIh38caaVawG2iWv51O3BZgRTbiSc7GrYORKyBNmqWuACvRs2jF4aTTsqFTQFwGP8tDHoWudkBghHn5bzwO00EmYz41OK'); 
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
