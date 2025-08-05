const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');
const { generateOTP, verifyOTP } = require('../services/otpService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Register user
exports.register = async (req, res) => {
  try {
    const { email, name, password, phone_number, referralCode } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Handle referral
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // Create user but mark as unverified
    const user = new User({
      email,
      name,
      password,
      phoneNumber: phone_number,
      referredBy,
      isVerified: false // Add this field to require email verification
    });

    // Generate referral code
    user.generateReferralCode();

    await user.save();

    // Generate and send OTP for email verification
    const otp = generateOTP(email);
    
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - TBG Registration',
        text: `Welcome to TBG! Your email verification OTP is: ${otp}. This OTP will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to TBG!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering with The Brain Gig! To complete your registration, please verify your email address.</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #333; margin: 0;">Your Verification Code</h3>
              <h1 style="color: #007bff; font-size: 32px; margin: 10px 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
            <p>Happy quizzing!</p>
            <p>The TBG Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Delete the user if email sending fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    // Don't return token yet - user needs to verify email first
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification code.',
      requiresVerification: true,
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors (unique constraint violations)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate OTP
    const otp = generateOTP(email);

    // Send email
    // Correct code in forgotPassword function
    await sendEmail({
      to: email,  // ✅ Correct parameter name
      subject: 'Password Reset OTP - TBG',
      text: `Your password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`
    });

    res.json({
      success: true,
      message: 'OTP sent to your email'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Use otpService to verify OTP instead of database fields
    const isValidOTP = verifyOTP(email, otp);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    // Verify OTP
    const isValid = verifyOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update password
    const user = await User.findOne({ email });
    user.password = new_password;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate and send new OTP
    const otp = generateOTP(email);
    await sendEmail({
      to: user.email,  // ✅ Changed from 'email' to 'to'
      subject: 'Password Reset OTP - TBG',  // ✅ Made consistent with forgotPassword
      text: `Your password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`  // ✅ Changed from 'message' to 'text'
    });

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};



// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Verify refresh token logic here
    // For now, return a simple response
    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// Google Sign In
exports.googleSignIn = async (req, res) => {
  try {
    const { email, name, googleId, profilePicture } = req.body;

    // Validate required fields
    if (!email || !name || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and Google ID are required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (profilePicture) user.profilePicture = profilePicture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email,
        name,
        googleId,
        authProvider: 'google',
        profilePicture: profilePicture || null,
        isVerified: true // Google users are automatically verified
      });
      
      // Generate referral code
      user.generateReferralCode();
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.googleId;

    res.json({
      success: true,
      message: 'Google sign-in successful',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};