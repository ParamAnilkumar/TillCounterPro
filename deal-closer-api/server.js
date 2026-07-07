require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Allow requests from all origins (so GitHub Pages can communicate with it)
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn('⚠️ WARNING: MONGO_URI is not set in the .env file.');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas successfully!'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));
}

// Mongoose Schema & Model
const dealCloserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  businessName: { type: String },
  address: { type: String },
  governmentIdImage: { type: String }, // Base64 string
  submittedAt: { type: Date, default: Date.now }
});

const DealCloser = mongoose.model('DealCloser', dealCloserSchema);

// API Endpoint
app.post('/api/deal-closer', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, businessName, address, governmentIdImage } = req.body;
    
    // In a real app, you would probably upload the base64 string to AWS S3 / Cloudinary here 
    // and save the URL. For now, we store the base64 string directly in Mongo.
    
    const newSubmission = new DealCloser({
      firstName, lastName, email, phone, businessName, address, governmentIdImage
    });

    await newSubmission.save();
    
    res.status(201).json({ success: true, message: 'Deal closed successfully!' });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Deal Closer API running on http://localhost:${PORT}`);
});
