const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const createInitialAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }
    
    // Create admin user
    const adminData = {
      email: 'admin@tbg.com',
      name: 'TBG Admin',
      password: 'Admin@123', // Change this to a secure password
      role: 'admin',
      isVerified: true
    };
    
    const admin = new User(adminData);
    await admin.save();
    
    console.log('✅ Initial admin user created successfully!');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

createInitialAdmin();