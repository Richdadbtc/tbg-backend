const crypto = require('crypto');

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();

exports.generateOTP = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  otpStore.set(email, { otp, expiresAt });
  return otp;
};

exports.verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return false;
  }
  if (stored.otp !== otp) return false;
  
  otpStore.delete(email);
  return true;
};

// Clear expired OTPs (run periodically)
exports.clearExpiredOTPs = () => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(exports.clearExpiredOTPs, 5 * 60 * 1000);