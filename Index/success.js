import ApiCalls from '../server/ApiCalls.js';
import checkAuthenticated from '../server/checkAuthenticated.js';

const checkAuth = new checkAuthenticated();
const API = new ApiCalls();

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure the user is authenticated
    await checkAuth.check();

    // Get session ID from URL and user details from localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const user = JSON.parse(localStorage.getItem('userDetails'));
    const username = user?.username;

    console.log('Session ID:', sessionId);
    console.log('User ID:', username);

    // Validate session and user ID
    if (!sessionId || !username) {
        alert('Missing session or user information.');
        return;
    }

    try {
        // Make API call to finalize the order
        const response = await fetch(API.success, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ sessionId, username }),
        });

        const result = await response.json();
        console.log('The result that we are passing to backend',result);
        if (response.ok && result.success) {
            await fetch(API.sendmessage,{
                method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({result}),
            })
            // Display success message
            document.body.innerHTML = `
                <h1>Payment Successful</h1>
                <p>Your order has been placed successfully. Order ID: <strong>${result.orderId}</strong></p>
                <a href="./index.html">Return to Home</a>
            `;
        } else {
            throw new Error(result.error || 'Failed to finalize order.');
        }
    } catch (error) {
        console.error('Error finalizing order:', error);

        // Display error message
        document.body.innerHTML = `
            <h1>Error</h1>
            <p>We encountered an error while finalizing your order. Please try again later.</p>
            <a href="./index.html">Return to Index</a>
        `;
    }
});
