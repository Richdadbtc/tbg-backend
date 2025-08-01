const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email function
exports.sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `TBG App <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to TBG!</h2>
      <p>Hi ${user.name},</p>
      <p>Welcome to The Brain Gig! We're excited to have you join our quiz community.</p>
      <p>Your referral code is: <strong>${user.referralCode}</strong></p>
      <p>Share this code with friends and earn $5 for each successful referral!</p>
      <p>Happy quizzing!</p>
      <p>The TBG Team</p>
    </div>
  `;
  
  return await this.sendEmail({
    to: user.email,
    subject: 'Welcome to TBG - Start Earning Today!',
    html
  });
};

// Send withdrawal confirmation email
exports.sendWithdrawalEmail = async (user, amount, method) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Withdrawal Request Confirmed</h2>
      <p>Hi ${user.name},</p>
      <p>Your withdrawal request has been processed:</p>
      <ul>
        <li>Amount: $${amount}</li>
        <li>Method: ${method}</li>
        <li>Date: ${new Date().toLocaleDateString()}</li>
      </ul>
      <p>The funds should arrive in your account within 1-3 business days.</p>
      <p>Thank you for using TBG!</p>
    </div>
  `;
  
  return await this.sendEmail({
    to: user.email,
    subject: 'TBG - Withdrawal Confirmed',
    html
  });
};