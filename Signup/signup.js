// import ApiCalls from "../server/ApiCalls.js";
// const API = new ApiCalls();

// const form = document.getElementById('signup-form');
//     const togglePasswordButton = document.getElementById('toggle-password');
//     const passwordInput = document.getElementById('password');
//     const confirmPasswordInput = document.getElementById('confirmPassword');
//     const passwordStrengthSpan = document.getElementById('password-strength');
//     const passwordMatchSpan = document.getElementById('password-match');
//     const verifyButton = document.getElementById('verify-button');

//     let passwordVisible = false;
//     function showPasswordMatch() {
//       const passwordMatchSpan = document.getElementById('password-match');
//       passwordMatchSpan.style.display = 'block'; // Make the span visible
//     }
//     function showPasswordSpan() {
//       const passwordSpan = document.getElementById('password-strength');
//       passwordSpan.style.display = 'block'; // Make the span visible
//     }
//     const checkPasswordStrength = (password) => {
//       const score = password.length * 10;
//       if (score > 80) return 'strong';
//       if (score > 45) return 'good';
//       if (score >= 30) return 'weak';
//       return 'poor';
//     };

//     const updatePasswordStrength = () => {
//       const strength = checkPasswordStrength(passwordInput.value);
//       passwordStrengthSpan.textContent = `Password strength: ${strength}`;
//     };

//     const updatePasswordMatch = () => {
//       const match = passwordInput.value === confirmPasswordInput.value ? 'Matched' : 'Not Matched';
//       passwordMatchSpan.textContent = `Password Match: ${match}`;
//     };

//     togglePasswordButton.addEventListener('click', () => {
//       passwordVisible = !passwordVisible;
//       passwordInput.type = passwordVisible ? 'text' : 'password';
//       togglePasswordButton.textContent = passwordVisible ? 'Hide' : 'Show';
//       togglePasswordButton.style.color = passwordVisible ? 'red' : 'green' ;
//     });

//     passwordInput.addEventListener('input', updatePasswordStrength);
//     confirmPasswordInput.addEventListener('input', updatePasswordMatch);

//     form.addEventListener('submit', async (event) => {
//       event.preventDefault();
//       if (passwordMatchSpan.textContent !== 'Password Match: Matched') {
//         alert('Passwords do not match!');
//         return;
//       }
//       const formData = new FormData(form);
//       const data = Object.fromEntries(formData.entries());

//       try {
//         const response = await fetch(API.signup, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(data),
//         });

//         const result = await response.json();
//         if (result.success) {
//           alert('Signup successful!');
//           window.location.href = 'TwoFactor.html'; // Redirect to TOTP setup
//         } else {
//           alert(result.message || 'Signup failed. Try again.');
//         }
//       } catch (error) {
//         alert('An error occurred during signup.');
//       }
//     });

//     verifyButton.addEventListener('click', () => {
//       const email = form.email.value;
//       const phone = form.phone.value;
//       if (!email || !phone) {
//         alert('Please enter your email and phone number before proceeding.');
//         return;
//       }
//       alert(`Redirecting to verification with email: ${email} and phone: ${phone}`);
//       window.location.href = `Verification.html?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;

//     });

import ApiCalls from "../server/ApiCalls.js";
const API = new ApiCalls();

const form = document.getElementById('signup-form');
const togglePasswordButton = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordStrengthSpan = document.getElementById('password-strength');
const passwordMatchSpan = document.getElementById('password-match');

let passwordVisible = false;

// Utility functions
const showElement = (element) => {
  element.style.display = 'block';
};

// Password strength checker
const checkPasswordStrength = (password) => {
  const score = password.length * 10;
  if (score > 80) return 'strong';
  if (score > 45) return 'good';
  if (score >= 30) return 'weak';
  return 'poor';
};

// Update password strength display
const updatePasswordStrength = () => {
  const strength = checkPasswordStrength(passwordInput.value);
  passwordStrengthSpan.textContent = `Password strength: ${strength}`;
  showElement(passwordStrengthSpan);
};

// Update password match display
const updatePasswordMatch = () => {
  const isMatch = passwordInput.value === confirmPasswordInput.value;
  passwordMatchSpan.textContent = `Password Match: ${isMatch ? 'Matched' : 'Not Matched'}`;
  showElement(passwordMatchSpan);
};

// Toggle password visibility
togglePasswordButton.addEventListener('click', () => {
  passwordVisible = !passwordVisible;
  passwordInput.type = passwordVisible ? 'text' : 'password';
  confirmPasswordInput.type = passwordVisible ? 'text' : 'password';
  togglePasswordButton.textContent = passwordVisible ? 'Hide' : 'Show';
  togglePasswordButton.style.color = passwordVisible ? 'red' : 'green';
});

// Attach event listeners for password inputs
passwordInput.addEventListener('input', updatePasswordStrength);
confirmPasswordInput.addEventListener('input', updatePasswordMatch);

// Form submission handler
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Ensure passwords match before proceeding
  if (passwordMatchSpan.textContent !== 'Password Match: Matched') {
    alert('Passwords do not match!');
    return;
  }

  // Collect form data
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Store data in localStorage temporarily for the verification page
  localStorage.setItem('signupData', JSON.stringify(data));

  // Redirect to verification page
  window.location.href = `Verification.html?email=${encodeURIComponent(data.email)}&phone=${encodeURIComponent(data.phone)}`;
});
