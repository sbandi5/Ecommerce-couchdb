// 
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const session = require('express-session');
const CouchDBStore = require('connect-couchdb')(session);
const User = require('./user'); // Database user model
const Database = require('./Database'); // Database connection module
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const stripe = require('stripe')('sk_test_51QSMF0D5Kjv0FeJloLFPSpWeLKTzDbTsMYfizW66tHOhAMPYIc7ri2HQBgsQBTL0Izj2QprTo4I6dFL710rOboBV00frBjAmzM');

// -----------------------------------------------------------------------------------------
//multer setup to handle the photo upload
const multer = require('multer'); // For handling multipart/form-data
// Ensure the Images directory exists
const imagesDir = "../Images/";
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../Images'));
  },
  filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
  },
});

const upload = multer({ storage });
// ----------------------------------------------------------------------------------------------
require('dotenv').config();
// Initialize app and database

// const certs = {
//    key : fs.readFileSync(path.join('/etc/ssl/', 'www.saimanikiranbandi.com_key.txt')),
//    cert : fs.readFileSync(path.join('/etc/ssl/', 'www.saimanikiranbandi.com.crt'))
// }
const db = Database.getInstance(); // Your custom Database module
const app = express();
const server = http.createServer( app);
const io = new Server(server,{
  cors: {
    origin: ["https://www.saimanikiranbandi.com","http://localhost:5500", "http://127.0.0.1:5500"], // Add allowed origins
    methods: ["GET", "POST"], // Allowed methods
    credentials: true, // Allow cookies/credentials if needed
  },
}); // Initialize Socket.IO

// Carrier Gateways for Email-to-SMS
const carrierGateways = [
  '@txt.att.net', // AT&T
  '@vtext.com', // Verizon
  '@tmomail.net', // T-Mobile
  '@messaging.sprintpcs.com', // Sprint
];


const sessionStore = new CouchDBStore({
  name: 'express-sessions', // CouchDB database name
  host: "localhost",
  port: 5984,
  username: process.env.Db_user, // Replace with your CouchDB username
  password: process.env.Db_password, // Replace with your CouchDB password
  ssl: false // true if using CouchDB over HTTPS
});


app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = ['https://www.saimanikiranbandi.com', 'http://localhost:5579', 'http://127.0.0.1:5579'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);



app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_default_secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,         // true if using HTTPS
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));


// Debugging Middleware
app.use((req, res, next) => {
  req.db = db;
  next();
});



// Middleware to check if user is authenticated
const authMiddleware = (req, res, next) => {
   // Handle preflight requests
   if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // Let the CORS middleware handle it
  }
  // List of routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/api/login', '/api/signup'];

  // Check if the user is logged in
  if (req.session && req.session.user) {
    next(); // User is logged in, proceed to the requested route
  } else if (publicRoutes.includes(req.path)) {
    next(); // Allow access to public routes
  } else {
    res.status(401).json({ message: 'Unauthorized' }); // Use JSON for API calls
  }
};

app.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ authenticated: true, user: req.session.user });
});

// Public routes (no auth middleware)
app.use('/api/login', express.static(path.join(__dirname, '../Login/login')));
app.use('/api/signup', express.static(path.join(__dirname, '../Signup/signup')));


// Protected routes (all other routes are automatically protected)
app.post('/',(req,res)=>{
  res.json({message:"Hello"});
});

// Route: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});



// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.Gmail_User,
    pass: process.env.Gmail_Password,
  },
});

// Function to send SMS via Email Gateways
const sendSMSViaEmailGateways = async (phoneNumber, message) => {
  const promises = carrierGateways.map(async (gateway) => {
    const recipient = `${phoneNumber}${gateway}`;
    const mailOptions = {
      from: process.env.Gmail_User,
      to: recipient,
      subject: '',
      text: message,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Message sent to ${recipient}: ${info.response}`);
    } catch (err) {
      console.error(`Failed to send to ${recipient}: ${err.message}`);
    }
  });

  await Promise.all(promises);
};
// -----------------------------------------------------------------------------------------------------------
// Route: Send SMS
// Send email
async function sendEmail(message, email) {
  try {
    await transporter.sendMail({
      from: process.env.Gmail_User,
      to: email,
      subject: 'Order Notification',
      text: message,
    });
  } catch (err) {
    console.error(`Failed to send email to ${email}: ${err.message}`);
    throw err; // Propagate the error to handle it in the calling function
  }
}

// Route: Send Message
app.post('/api/send-Message', async (req, res) => {
  const result = req.body.result;
  const user = req.session.user;

  if (!user || !result.orderId) {
    return res.status(400).json({ success: false, message: 'Invalid request. Missing user or order ID.' });
  }

  try {
    // Fetch buyer details
    const buyerData = await req.db.getuserDetailsbyUsername(user.username);
    if (!buyerData.length) {
      return res.status(404).json({ success: false, message: 'Buyer details not found.' });
    }

    const buyer = buyerData[0];
    console.log('The buyer details:', buyer);

    // Fetch order details
    const orderDetails = await req.db.getorderDetailsbyOrderID(result.orderId);
    if (!orderDetails.length) {
      return res.status(404).json({ success: false, message: 'Order details not found.' });
    }

    console.log('Order details:', orderDetails);

    // Compose email for the buyer
    const buyerMessage = `
      Hello ${buyer.fname} ${buyer.lname},
      
      Your order has been successfully placed.
      Order ID: ${result.orderId}
      
      Your order details:
      ${orderDetails.map((item, index) => `${index + 1}. ${item.Name} - ${item.Quantity} x $${item.Price}`).join('\n')}
      
      Total: $${orderDetails.reduce((sum, item) => sum + item.Quantity * item.Price, 0).toFixed(2)}
      
      It will arrive in 3-5 business days. Thank you for shopping with us!
    `;

    // Send confirmation email to buyer
    await sendEmail(buyerMessage, buyer.email);

    // Notify sellers for each item in the order
    for (const item of orderDetails) {
      const senderDetails = await req.db.getSenderEmailByItemID(item.ItemID);
      if (!senderDetails.length) {
        console.warn(`No seller details found for ItemID: ${item.ItemID}`);
        continue;
      }

      const sender = senderDetails[0];
      const sellerMessage = `
        Hello ${sender.fname} ${sender.lname},
        
        The item "${item.Name}" you listed has been purchased by:
        ${buyer.fname} ${buyer.lname}
        
        Please ship the item to:
        ${buyer.aptAddress}, ${buyer.street}, ${buyer.city}, ${buyer.state}, ${buyer.areaCode}.
        
        Thank you for using our service.
      `;

      // Send notification email to seller
      await sendEmail(sellerMessage, sender.email);
    }

    res.json({ success: true, message: 'Order confirmation and seller notification emails sent.' });
  } catch (err) {
    console.error('Error in /api/send-Message:', err);
    res.status(500).json({ success: false, message: 'Failed to send order confirmation or notifications.', error: err.message });
  }
});


// Route: Send Verification
app.post('/api/send-verification', async (req, res) => {
  console.log('Session ID during OTP generation:', req.sessionID);
  console.log('Initial Session:', req.session);
  const otp = Math.floor(100000 + Math.random() * 900000);
  req.session.otp = otp;
  req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
  console.log('Updated Session:', req.session);
  try {
    const smsMessage = `Your verification code is ${otp} and the code will expires in 5 minutes`;
    await sendSMSViaEmailGateways(req.body.phone, smsMessage);
    await transporter.sendMail({
      from: process.env.Gmail_User,
      to: req.body.email, subject: 'Your Verification Code',
      text: smsMessage,
    });
    console.log('OTP:', req.session.otp, 'Expiry:', req.session.otpExpiry);
    res.json({
      success: true, message: 'Verification code sent via SMS and email'
    });
  } catch (err) {
    console.error('Error Sending Verification:', err);
    res.status(500).json({
      success: false, message: 'Failed to send verification code'
    });
  }
});
//verifying otp route
app.post('/api/verify-otp', (req, res) => {
  console.log('Session ID during OTP verification:', req.sessionID);
  console.log('Session During Verification:', req.session);
  console.log('Stored OTP:', req.session.otp, 'Expiry:', req.session.otpExpiry);
  if (!req.session.otp || req.session.otpExpiry < Date.now()) {
    return res.status(401).json({
      success: false, message: 'OTP expired'
    });
  }
  if (parseInt(req.body.otp, 10) === req.session.otp) {
    req.session.otpVerified = true;
    return res.json({
      success: true, message: 'OTP verified successfully'
    });
  } else {
    return res.status(401).json({
      success: false, message: 'Invalid OTP'
    });
  }
});

// ---------------------------------------------------------------------------------------
// Signup and Login routes
// Route: User Signup
app.post('/api/signup', async (req, res) => {
  try {
    console.log('----------------------------------------');
    console.log(req.body)
    console.log('----------------------------------------');
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    console.log('I,m in the signup route');
    // Create a new User object
    const user = new User(
      req.body.fname,
      req.body.lname,
      req.body.email,
      req.body.username,
      hashedPassword,
      req.body.aptAddress,
      req.body.street,
      req.body.city,
      req.body.state,
      req.body.areaCode,
      req.body.phone
    );
    console.log('User in the signup:', user);

    try {
      const result = await req.db.updateNewUser(user); // Insert user into the database
      console.log('User added to database:', result);
      res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
      console.error('Error adding user to database:', err);
    }
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ success: false, error: 'An error occurred during signup' });
  }
});

// Route: User Login
app.post('/api/login', async (req, res) => {
  try {
    console.log('The body of request:', req.body);
    const results = await req.db.getuserDetails(req.body.email);

    if (!results || results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = results;
    
    // Compare the password
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (isMatch) {
      // Store minimal user details in session
      req.session.user = {
        id: user.id,
        role: user.role,
        username: user.username,
      };

      // Generate JWT token
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });

      return res.json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, error: 'An error occurred during login' });
  }
});

//-----------------------------------------------------------------------------------------------------------

// Route: Check Session
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});



//-------------------------------------------------------------------------------------
//user section
// Endpoint to update user details
app.get('/api/user', async (req, res) => {
  const user = req.session.user;
  try{
    const userDetails = await req.db.getuserDetailsbyUsername(user.username);
    res.json({ userDetails, message: "User details updated successfully" });
  }catch(err){
    console.error('Error fetching user details:', err);
    res.json({message : "Error fetching user details" });
  }
});







// Start Server
server.listen(12346, () => console.log('Server running on port 12346'));



