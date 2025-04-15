
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
