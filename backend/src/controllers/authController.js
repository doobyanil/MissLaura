const prisma = require('../config/database');
const { hashPassword, comparePassword, generateRandomPassword } = require('../utils/password');
const { generateToken, generateResetToken } = require('../utils/jwt');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { AppError } = require('../middleware/errorHandler');

// School signup (creates school + admin user)
const signup = async (req, res, next) => {
  try {
    const { schoolName, schoolEmail, schoolPhone, schoolAddress, adminName, adminEmail, password } = req.body;

    // Check if school email already exists
    const existingSchool = await prisma.school.findUnique({
      where: { email: schoolEmail }
    });

    if (existingSchool) {
      return next(new AppError('A school with this email already exists', 409));
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return next(new AppError('A user with this email already exists', 409));
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create school and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create school
      const school = await tx.school.create({
        data: {
          name: schoolName,
          email: schoolEmail,
          phone: schoolPhone,
          address: schoolAddress
        }
      });

      // Create admin user
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          schoolId: school.id
        },
        include: { school: true }
      });

      return { school, admin };
    });

    // Generate JWT token
    const token = generateToken({ id: result.admin.id });

    res.status(201).json({
      message: 'School registered successfully',
      user: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role,
        school: result.admin.school
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    // Compare password
    console.log('Comparing passwords...');
    const isMatch = await comparePassword(password, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Generate token
    const token = generateToken({ id: user.id });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        school: user.school
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { school: true }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        school: user.school
      }
    });
  } catch (error) {
    next(error);
  }
};

// Change password (for first-time login or voluntary change)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Please provide current and new password', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters', 400));
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// Forgot password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Please provide your email', 400));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
};

// Reset password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new AppError('Please provide token and new password', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters', 400));
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
};