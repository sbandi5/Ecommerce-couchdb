import APIS from '../server/ApiCalls.js';
const API = new APIS();
const emailInput = document.getElementById('email-input');
const phoneInput = document.getElementById('phone-input');
const otpInput = document.getElementById('otp-input');
const sendVerificationBtn = document.getElementById('send-verification-btn');
const verifyOtpBtn = document.getElementById('verify-otp-btn');

// Extract query parameters
const urlParams = new URLSearchParams(window.location.search);
const initialEmail = urlParams.get('email');
const initialPhone = urlParams.get('phone');

if (initialEmail && initialPhone) {
  emailInput.value = initialEmail;
  phoneInput.value = initialPhone;
} else {
  alert('Email and phone number are required!');
  window.location.href = 'signup.html'; // Redirect to signup if query parameters are missing
}

// Send Verification
sendVerificationBtn.addEventListener('click', async () => {
  console.log('Email:', initialEmail, 'Phone:', initialPhone); // Debug values

  try {
    const response = await fetch(API.verification, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure cookies are included in the request
      body: JSON.stringify({ email: initialEmail, phone: initialPhone }),
    });

    const result = await response.json(); // Parse the response
    console.log(result);

    if (result.success) {
      alert('Verification code sent');
    } else {
      alert(result.message || 'Failed to send verification. Please try again.');
    }
  } catch (error) {
    console.error('Error sending verification:', error);
    alert('Failed to send verification. Please try again.');
  }
});

// Verify OTP
verifyOtpBtn.addEventListener('click', async () => {
  const otp = otpInput.value;

  if (!otp) {
    alert('Please enter the OTP.');
    return;
  }

  try {
    const response = await fetch(API.authentication, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure cookies are included in the request
      body: JSON.stringify({ otp }),
    });

    const result = await response.json();
    if (result.success) {
      alert('OTP verified successfully');
      const signupData = JSON.parse(localStorage.getItem('signupData'));

      if (!signupData) {
        alert('Signup details are missing. Redirecting to signup.');
        window.location.href = 'signup.html';
        return;
      }

      // Save user details to the database
      const signupResponse = await fetch(API.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const signupResult = await signupResponse.json();

      if (signupResult.success) {
        alert('Signup successful! Redirecting to login.');
        localStorage.removeItem('signupData'); // Clear temporary data
        window.location.href = '../Login/login.html'; // Redirect to login page
      } else {
          alert(signupResult.message || 'Signup failed after verification.');
      }
    } else {
      alert('Invalid OTP');
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    alert('Failed to verify OTP. Please try again.');
  }
});

// import APIS from '../server/ApiCalls.js';
// const API = new APIS();

// const emailInput = document.getElementById('email-input');
// const phoneInput = document.getElementById('phone-input');
// const otpInput = document.getElementById('otp-input');
// const sendVerificationBtn = document.getElementById('send-verification-btn');
// const verifyOtpBtn = document.getElementById('verify-otp-btn');

// // Extract query parameters
// const urlParams = new URLSearchParams(window.location.search);
// const initialEmail = urlParams.get('email');
// const initialPhone = urlParams.get('phone');

// if (initialEmail && initialPhone) {
//   emailInput.value = initialEmail;
//   phoneInput.value = initialPhone;
// } else {
//   alert('Email and phone number are required! Redirecting to signup.');
//   window.location.href = 'signup.html'; // Redirect to signup if query parameters are missing
// }

// // Automatically send verification when page loads
// sendVerificationBtn.addEventListener('click', async () =>  {
//   console.log('Sending verification for Email:', initialEmail, 'Phone:', initialPhone);

//   try {
//     const response = await fetch(API.verification, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include', // Ensure cookies are included in the request
//       body: JSON.stringify({ email: initialEmail, phone: initialPhone }),
//     });

//     const result = await response.json();
//     if (result.success) {
//       alert('Verification code sent. Check your email and phone.');
//     } else {
//       alert(result.message || 'Failed to send verification. Please try again.');
//     }
//   } catch (error) {
//     console.error('Error sending verification:', error);
//     alert('Failed to send verification. Please try again.');
//   }
// });

// // Verify OTP and complete signup
// verifyOtpBtn.addEventListener('click', async () => {
//   const otp = otpInput.value;

//   if (!otp) {
//     alert('Please enter the OTP.');
//     return;
//   }

//   try {
//     // Verify the OTP
//     const response = await fetch(API.authentication, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include', // Ensure cookies are included in the request
//       body: JSON.stringify({ otp }),
//     });

//     const result = await response.json();

//     if (result.success) {
//       // Retrieve stored signup data from localStorage
//       const signupData = JSON.parse(localStorage.getItem('signupData'));

//       if (!signupData) {
//         alert('Signup details are missing. Redirecting to signup.');
//         window.location.href = 'signup.html';
//         return;
//       }

//       // Save user details to the database
//       const signupResponse = await fetch(API.signup, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(signupData),
//       });

//       const signupResult = await signupResponse.json();

//       if (signupResult.success) {
//         alert('Signup successful! Redirecting to login.');
//         localStorage.removeItem('signupData'); // Clear temporary data
//         window.location.href = '../Login/login.html'; // Redirect to login page
//       } else {
//         alert(signupResult.message || 'Signup failed after verification.');
//       }
//     } else {
//       alert('Invalid OTP. Please try again.');
//     }
//   } catch (error) {
//     console.error('Error verifying OTP or completing signup:', error);
//     alert('An error occurred. Please try again.');
//   }
// });
