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

const certs = {
   key : fs.readFileSync(path.join('/etc/ssl/', 'www.saimanikiranbandi.com_key.txt')),
   cert : fs.readFileSync(path.join('/etc/ssl/', 'www.saimanikiranbandi.com.crt'))
}
const db = Database.getInstance(); // Your custom Database module
const app = express();
const server = https.createServer(certs, app);
const io = new Server(server,{
  cors: {
    origin: ["https://www.saimanikiranbandi.com","http://localhost:5579", "http://127.0.0.1:5579"], // Add allowed origins
    // methods: ["GET", "POST"], // Allowed methods
    credentials: true, // Allow cookies/credentials if needed
  },
}); 
// Initialize Socket.IO
// Import the Socket.IO module
const initializeSocket = require('./socket');
const stockUpdate =initializeSocket(io, db); // Pass the Socket.IO instance to the module
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
  ssl: true // true if using CouchDB over HTTPS
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
    secure: true,         // true if using HTTPS
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

// ----------------------------------------------------------------------------------------------------------
// Route: Fetch items and adding items
// get items from the database
app.get('/api/items', async (req, res) => {
  try {
    const results = await req.db.getItemsStock(); // Fetch items from the database
    console.log(results);
    res.json(results); // Send items as JSON response
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({
      success: false,
      error: 'An error occurred while fetching items',
    });
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


app.post('/api/updateuser', async (req, res) => {
  try {
    // Ensure the session exists
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    const { password, ...userDetails } = req.body; // Destructure password separately

    // Hash the password if it's included in the request
    if (password) {
      userDetails.password = await bcrypt.hash(password, 10);
    }

    // Construct the User object
    const user = new User(
      userDetails.fname,
      userDetails.lname,
      userDetails.email,
      userDetails.username,
      userDetails.password, // May be undefined if no password update
      userDetails.aptAddress,
      userDetails.street,
      userDetails.city,
      userDetails.state,
      userDetails.areaCode,
      userDetails.phone
    );
    // Update user details in the database
    const result = await req.db.updateUser(user, req.session.user.username);

    // Respond with success message
    res.status(200).json({
      message: 'Successfully updated user details',
      result,
    });
  } catch (err) {
    console.error('Error updating user details:', err);

    // Respond with a sanitized error message
    res.status(500).json({
      message: 'Error updating user details',
      error: err.message || 'Internal server error',
    });
  }
});



// Fetch all items

app.get('/api/get-add-items', async(req, res) => {
  //res.json(items);
  const items = await req.db.getItemsStockByUsername(req.session.user.username);
  res.json({items,message:'Fetched Items'});
});


//
// Create a new item
app.post('/api/add-items', upload.array('itemPhotos', 10), async (req, res) => {
  try {
      const { itemName, itemDescription, itemPrice, itemStock, itemType } = req.body;
      const Files = req.files;
      const filenames= [];
      for(let i = 0; i < Files.length; i++){
        filenames[i] = 'Images/'+Files[i].filename;
        console.log("The filenames is: ", filenames[i]);
      }
      const user = req.session.user;
      console.log('The user details got in the add items: ', user);
      // Create the new item object
      const newItem = {
          Name: itemName,
          Description:itemDescription,
          Price: parseFloat(itemPrice),
          Stock: parseInt(itemStock),
          Type : itemType,
          itemPhotos: filenames,
	        UserName: user.username
      };
      console.log('The UserName is ', newItem.UserName);
      try{
        const result = await req.db.insertItem(newItem);
        console.log(result);
      }catch(err){
        console.log(err);
      }
      // Broadcast the updated stock to all connected clients
      await stockUpdate.fetchAndBroadcastStock();
      res.status(201).json({ message: 'Item created successfully', item: newItem });
  } catch (err) {
      console.error('Error creating item:', err);
      res.status(500).json({ message: 'Failed to create item', error: err.message });
  }
});

app.post('/api/add-to-cart', async (req, res) => {
  const user = req.session.user;
  const item = req.body.item;

  if (!user) {
    return res.status(401).json({ message: 'User not authenticated', error: 'Unauthorized' });
  }

  if (!item || !item.ItemID) {
    return res.status(400).json({ message: 'Invalid item data', error: 'Bad Request' });
  }

  try {
    const itemExists = await req.db.checkIfItemInCart(user.id, item.ItemID);

    if (itemExists) {
      return res.status(409).json({ message: 'Item already in cart', error: 'Conflict' });
    }
    const checkQuantity = await req.db.checkQuantity(item.ItemID);
    if(checkQuantity){
      await req.db.addItemToCart(user.id, item.ItemID);
      return res.json({ message: 'Item added to cart successfully', error: null });
    }else{
      return res.status(404).json({ message: 'Item out of stock' });
    }
  } catch (err) {
    console.error('Error adding item to cart:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});
//Route: retrive cart items from database
app.get('/api/cart', async (req, res) => {
  const user = req.session.user;

  if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
      const cartItems = await req.db.getCartItems(user.id);
      res.json({ message: 'Cart retrieved successfully', cartItems , user});
  } catch (err) {
      console.error('Error retrieving cart items:', err);
      res.status(500).json({ message: 'Failed to retrieve cart', error: err });
  }
});

app.delete('/api/remove-from-cart', async (req, res) => {
  const user = req.session.user;
  const { itemId } = req.body;

  if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
      await req.db.removeItemFromCart(user.id, itemId);
      res.json({ message: 'Item removed from cart' });
  } catch (err) {
      console.error('Error removing item from cart:', err);
      res.status(500).json({ message: 'Failed to remove item from cart', error: err });
  }
});

app.put('/api/update-cart', async (req, res) => {
  const { itemId, quantity } = req.body;
  const user = req.session.user;

  if (!user) {
      return res.status(401).json({ message: 'Unauthorized user' });
  }

  if (!itemId || !quantity) {
      return res.status(400).json({ message: 'Item ID and quantity are required' });
  }

  try {
      console.log('Updating cart:', { userId: user.id, itemId, quantity });

      // Check if cart exists
      const cart = await req.db.getActiveCart(user.id);
      if (!cart) {
          console.error('No active cart found for user:', user.id);
          return res.status(404).json({ message: 'No active cart found' });
      }

      // Get item stock
      const stock = await req.db.getItemStock(itemId);
      if (!stock) {
          console.error('Item not found in inventory:', itemId);
          return res.status(404).json({ message: 'Item not found in inventory' });
      }

      if (quantity > stock) {
          console.error('Quantity exceeds stock:', { itemId, quantity, stock });
          return res.status(400).json({ message: 'Requested quantity exceeds stock' });
      }

      if (quantity > 5) {
          console.error('Quantity exceeds limit of 5:', { itemId, quantity });
          return res.status(400).json({ message: 'You can only add up to 5 of this item per order' });
      }

      // Update quantity in cart
      await req.db.updateCartQuantity(cart.CartID, itemId, quantity);
      console.log('Quantity updated successfully:', { cartId: cart.CartID, itemId, quantity });
      res.json({ message: 'Quantity updated successfully' });

  } catch (err) {
      console.error('Error updating cart quantity:', err);
      res.status(500).json({ message: 'Failed to update cart quantity', error: err.message });
  }
});

// Mark item as sold (example)
// Mark item as sold
app.put('/items/:id/sell', async (req, res) => {
  const itemId = parseInt(req.params.id);
  const { buyer } = req.body;

  // Find the item in the database or in-memory array
  const item = items.find((i) => i.id === itemId);

  if (item) {
      try {
          // Update the item in the database
          await req.db.query('UPDATE items SET status = ?, buyer = ? WHERE id = ?', ['sold', buyer, itemId]);

          // Update the in-memory `items` array
          item.status = 'sold';
          item.buyer = buyer;

          res.json({ message: 'Item marked as sold', item });
      } catch (err) {
          console.error('Error updating item status:', err);
          res.status(500).json({ message: 'Failed to mark item as sold', error: err.message });
      }
  } else {
      res.status(404).json({ message: 'Item not found' });
  }
});

app.post('/payment', async (req, res) => {
    try {
        const { cartItems } = req.body;

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ error: "Cart items are required." });
        }

        // Convert cart items to Stripe line items
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.Name,
                    description: item.Description || 'No description available',
                },
                unit_amount: Math.round(item.Price * 100), // Stripe expects cents
                tax_behavior: 'exclusive', // Tax is added on top
            },
            quantity: item.Quantity,
            tax_rates: ['txr_1QUXDhD5Kjv0FeJlmcXeQ42U'], // Ensure this tax rate matches your Stripe settings
        }));

        console.log("Line items for Stripe Checkout:", lineItems);

        // Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'https://www.saimanikiranbandi.com/Ecommerce/Index/success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://www.saimanikiranbandi.com/Ecommerce/Index/cart.html',
	    //success_url : 'http://localhost:5500/Index/success.html?session_id={CHECKOUT_SESSION_ID}',
            //cancel_url: 'http://localhost:5500/Index/cart.html',
        });

        res.json({ sessionId: session.id });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session." });
    }
});


app.post('/finalize-order', async (req, res) => {
  try {
      const { sessionId, userId } = req.body;

      // Verify Stripe session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session || session.payment_status !== 'paid') {
          return res.status(400).json({ error: 'Payment not completed.' });
      }

      // Fetch cart items
      const cartItems = await req.db.getCartItems(userId);
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
          return res.status(400).json({ error: 'No items in cart.' });
      }

      // Calculate total amount
      const totalAmount = cartItems.reduce((sum, item) => sum + item.Price * item.Quantity, 0);

      // Insert new order with status 'Pending'
      const orderResult = await req.db.insertOrder(userId, totalAmount);
      const orderId = orderResult.insertId; // Access the `insertId` property directly


      // Insert order items
      await req.db.insertOrderItems(orderId, cartItems);

      // Reduce stock in items table
      await req.db.reduceStock(cartItems);

      await req.db.markCartAsCheckedOut(userId);
      // Broadcast the updated stock to all connected clients
      await stockUpdate.fetchAndBroadcastStock();
      res.json({ success: true, orderId });
  } catch (error) {
      console.error('Error finalizing order:', error);
      res.status(500).json({ error: 'Failed to finalize order.' });
  }
});

app.get('/api/ordered-items', async (req, res) => {
  const user = req.session.user;

  if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized user' });
  }

  try {
      const orderedItems = await req.db.getOrderedItemsByUserId(user.id);

      if (orderedItems.length === 0) {
          return res.json({ success: true, orderedItems: [] }); // No items ordered
      }

      res.json({ success: true, orderedItems });
  } catch (error) {
      console.error('Error fetching ordered items:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch ordered items', error: error.message });
  }
});

app.get('/api/user-details', async (req, res) => {
  try {
      const user = req.session.user;
      if (!user) {
          return res.status(401).json({ success: false, message: 'Unauthorized user' });
      }

      const userDetails = await req.db.getuserDetailsbyUsername(user.username);
      if (!userDetails.length) {
          return res.status(404).json({ success: false, message: 'User details not found' });
      }

      res.json({ success: true, user: userDetails[0] });
  } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
});




// Start Server
server.listen(12346, () => console.log('Server running on port 12346'));



