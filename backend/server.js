 
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');  
const bodyParser = require('body-parser');  
const cors = require('cors');


const passport = require('passport');  
const session = require('express-session');  

 
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const segmentRoutes = require('./routes/segmentRoutes');
const dummyVendorRoutes = require('./routes/dummyVendorRoutes');
const deliveryReceiptRoutes = require('./routes/deliveryReceiptRoutes');
const authRoutes = require('./routes/authRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
 

 
require('./config/passportSetup');  


const app = express();
const port = process.env.PORT || 3000;  

 
const mongoURI = process.env.MONGODB_URI;

 
const connectDB = async () => {
  try {
     
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected Successfully!');
  } catch (err) {
    console.error('MongoDB Connection Failed:', err.message);
     
    process.exit(1);
  }
};


 

 
 
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true  
}));

 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  



app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false, 
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, 
    
  }
}));

app.use(passport.initialize()); 
app.use(passport.session());   


app.get('/', (req, res) => {
  res.send('Xeno CRM Backend is running!');
});

 
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/dummyVendor', dummyVendorRoutes);
app.use('/api/delivery-receipts', deliveryReceiptRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/auth', authRoutes); 
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

