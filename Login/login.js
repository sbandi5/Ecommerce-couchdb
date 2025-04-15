import APIS from '../server/ApiCalls.js';
const API = new APIS();

const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const togglePasswordButton = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    let passwordVisible = false;

    togglePasswordButton.addEventListener('click', () => {
      passwordVisible = !passwordVisible;
      passwordInput.type = passwordVisible ? 'text' : 'password';
      togglePasswordButton.textContent = passwordVisible ? 'Hide' : 'Show';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
      loginButton.value = 'Logging in...';
      loginButton.disabled = true;

      const email = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        let startTime = performance.now(); // Start time for performance measurement
        //const response = await fetch(API.Mysqllogin, {
        const response = await fetch(API.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Ensure cookies are included in the request
          body: JSON.stringify({ email, password })
        });
        let endTime = performance.now(); // End time for performance measurement
        console.log('Time taken for API call:', endTime - startTime, 'ms'); // Log the time taken
        console.log('response:', response);
        const result = await response.json();
        console.log('Result:', result);
        if (result.success) {
          window.location.href = '../Index/index.html'; // Navigate to the dashboard
        } else {
          errorMessage.style.display = 'block';
          errorMessage.textContent = 'Invalid email or password';
        }
      } catch (error) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'An error occurred. Please try again.';
      } finally {
        loginButton.value = 'Login';
        loginButton.disabled = false;
      }
    });
