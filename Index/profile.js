import ApiCalls from '../server/ApiCalls.js';
import checkAuthenticated from '../server/checkAuthenticated.js';

const API = new ApiCalls();
const checkAuth = new checkAuthenticated();

let originalUserDetails = {}; // Global variable to store fetched user details

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth.check();
    fetchUserDetails();
});

// Fetch and populate user details
async function fetchUserDetails() {
    const loadingMessage = document.querySelector(".loading");
    const form = document.getElementById("userDetails");
    try {
        const response = await fetch(API.user, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to fetch user details");
        }

        const data = await response.json();
        originalUserDetails = data.userDetails[0]; // Assuming userDetails is an array
        console.log("Fetched user details:", originalUserDetails);

        // Populate fields dynamically
        Object.keys(originalUserDetails).forEach(key => {
            const displayField = document.getElementById(`${key}Display`);
            if (displayField) {
                displayField.textContent = originalUserDetails[key];
            }
        });

        loadingMessage.style.display = "none";
        form.style.display = "block";
    } catch (error) {
        loadingMessage.textContent = "Error loading user details.";
        console.error("Error fetching user details:", error);
    }
}

// Enable editing of fields
document.querySelectorAll(".edit-btn").forEach(button => {
    button.addEventListener("click", (event) => {
        const field = event.target.dataset.field;
        const displaySpan = document.getElementById(`${field}Display`);
        const currentValue = displaySpan.textContent;

        // Replace span with input
        const input = document.createElement("input");
        input.type = "text";
        input.id = field;
        input.value = currentValue;
        input.classList.add("detail-value");

        displaySpan.replaceWith(input);

        // Enable Save button
        document.getElementById("saveButton").disabled = false;
    });
});

// Monitor changes in password fields
document.getElementById("newPassword").addEventListener("input", enableSaveButton);
document.getElementById("confirmPassword").addEventListener("input", enableSaveButton);

// Enable Save button when passwords are edited
function enableSaveButton() {
    document.getElementById("saveButton").disabled = false;
}

// Save updated user details
async function saveUserDetails() {
    const updatedDetails = {};

    // Collect updated values from inputs
    document.querySelectorAll("input.detail-value").forEach(input => {
        updatedDetails[input.id] = input.value;
    });

    // Merge original data with updated data
    const finalDetails = { ...originalUserDetails, ...updatedDetails };

    // Get password fields
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validate passwords if either is filled
    if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match. Please try again.");
            return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }
        finalDetails.password = newPassword; // Include the password in the payload
        console.log(finalDetails);
    }

    console.log("Final user details to be saved:", finalDetails);

    try {
        const response = await fetch(API.updateuser, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(finalDetails),
        });

        if (!response.ok) {
            throw new Error("Failed to save user details");
        }
        alert("User details saved successfully.");

        // Reload user details
        fetchUserDetails();
    } catch (error) {
        alert("Failed to save user details. Please try again later.");
        console.error("Error saving user details:", error);
    }
}

document.getElementById("saveButton").addEventListener("click", saveUserDetails);
