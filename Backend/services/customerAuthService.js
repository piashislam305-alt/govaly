const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('./emailService');

const registerCustomer = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw {
      status: 400,
      message: 'User with this email already exists.',
    };
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  return user;
};

const authenticateCustomer = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw {
      status: 401,
      message: 'Invalid credentials.',
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw {
      status: 401,
      message: 'Invalid credentials.',
    };
  }

  const token = jwt.sign(
    {
      id: user._id,
      role: 'customer',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );

  return { token, user };
};

module.exports = {
  registerCustomer,
  authenticateCustomer,
  changePassword,
  forgotPassword,
  resetPassword,
};

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw { status: 400, message: 'Current password is incorrect.' };
  if (!newPassword || newPassword.length < 6) {
    throw { status: 400, message: 'New password must be at least 6 characters.' };
  }

  user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
  await user.save();
}

async function forgotPassword(email) {
  const user = await User.findOne({ email });
  // Always respond the same way whether or not the email exists — never
  // reveal which emails are registered.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

async function resetPassword(rawToken, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters.' };
  }
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw { status: 400, message: 'This reset link is invalid or has expired.' };

  user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
}