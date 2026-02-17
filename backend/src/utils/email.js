const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = () => {
  // For development, use console output or a test SMTP
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    // Log emails to console in development
    return {
      sendMail: async (options) => {
        console.log('='.repeat(50));
        console.log('EMAIL (Development Mode)');
        console.log('='.repeat(50));
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Text:', options.text);
        if (options.html) {
          console.log('HTML:', options.html.substring(0, 500) + '...');
        }
        console.log('='.repeat(50));
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  // Production SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

const sendEmail = async (options) => {
  const mailOptions = {
    from: `"Miss Laura Worksheets" <${process.env.SMTP_USER || 'noreply@misslaura.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Email templates
const sendWelcomeEmail = async (email, name, schoolName, tempPassword) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  await sendEmail({
    to: email,
    subject: `Welcome to Miss Laura - Your Teacher Account`,
    text: `Hello ${name},

Welcome to Miss Laura Worksheets! You have been added as a teacher at ${schoolName}.

Your temporary login credentials:
Email: ${email}
Password: ${tempPassword}

Please login at ${frontendUrl}/login and change your password.

Best regards,
The Miss Laura Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Miss Laura!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 16px;">Welcome to Miss Laura Worksheets! You have been added as a teacher at <strong>${schoolName}</strong>.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #333;">Your Login Credentials</h3>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #eee; padding: 2px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          <a href="${frontendUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Login Now</a>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">Please change your password after your first login.</p>
          <p style="font-size: 16px;">Best regards,<br>The Miss Laura Team</p>
        </div>
      </div>
    `
  });
};

const sendPasswordResetEmail = async (email, name, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  await sendEmail({
    to: email,
    subject: 'Miss Laura - Password Reset',
    text: `Hello ${name},

You requested a password reset for your Miss Laura account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this, please ignore this email.

Best regards,
The Miss Laura Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 16px;">You requested a password reset for your Miss Laura account.</p>
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0;">Reset Password</a>
          <p style="font-size: 14px; color: #666;">This link will expire in 1 hour.</p>
          <p style="font-size: 14px; color: #666;">If you did not request this, please ignore this email.</p>
          <p style="font-size: 16px;">Best regards,<br>The Miss Laura Team</p>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};