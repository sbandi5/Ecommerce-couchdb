import ApiCalls from './ApiCalls.js';
const API = new ApiCalls();
class checkAuthenticated{
    constructor(){

    }

    async check() {
        try {
          const response = await fetch(API.Protected, {
            method: 'GET',
            credentials: 'include', // Ensure cookies are sent with the request
          });
      
          if (response.status === 401) {
            // If unauthorized, redirect to login
            window.location.href = '../Login/login.html';
          } else {
            const result = await response.json();
            console.log('User authenticated:', result.user);
            // Optionally, display user info or proceed with page logic
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
          window.location.href = '../Login/login.html'; // Redirect on error
        }
    }
}

export default checkAuthenticated;