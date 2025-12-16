const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'student' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Create verification token
    const emailVerificationToken = uuidv4();

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      emailVerificationToken
    });

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    await user.update({ lastLogin: new Date() });

    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ldapService = require('../services/ldapService');
    const bcrypt = require('bcryptjs');

    // Find existing user
    let user = await User.findOne({ where: { email } });

    // If user exists
    if (user) {
      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ error: 'Account is deactivated.' });
      }

      // If user is LDAP user, authenticate via LDAP
      if (user.authProvider === 'ldap') {
        if (ldapService.isEnabled()) {
          const ldapResult = await ldapService.authenticateUser(email, password);
          if (!ldapResult.success) {
            console.log(`[auth] LDAP auth failed for ${email}: ${ldapResult.error}`);
            return res.status(401).json({ error: 'Invalid email or password.' });
          }
        } else {
          return res.status(401).json({ error: 'LDAP authentication is not available.' });
        }
      } else {
        // Local user - verify password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[auth] Login failed: invalid password for email ${email}`);
          }
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
      }
    } else {
      // User not found in local DB - try LDAP if enabled
      if (ldapService.isEnabled()) {
        console.log(`[auth] User ${email} not found locally, trying LDAP...`);
        const ldapResult = await ldapService.authenticateUser(email, password);

        if (!ldapResult.success) {
          console.log(`[auth] LDAP auth failed for ${email}: ${ldapResult.error}`);
          return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // LDAP auth successful - auto-create user as teacher
        console.log(`[auth] LDAP auth successful for ${email}, creating local user...`);

        // Generate a random password (won't be used for LDAP users)
        const randomPassword = uuidv4();
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        user = await User.create({
          email: ldapResult.user.email || email,
          password: hashedPassword,
          firstName: ldapResult.user.firstName || 'AD',
          lastName: ldapResult.user.lastName || 'User',
          role: 'teacher', // Default role for AD users
          authProvider: 'ldap',
          isEmailVerified: true, // AD users are pre-verified
          isActive: true
        });

        console.log(`[auth] Created LDAP user: ${user.email} with role: ${user.role}`);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[auth] Login failed: user not found for email ${email}`);
        }
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    await user.update({ lastLogin: new Date() });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
        isPasswordChangeRequired: user.isPasswordChangeRequired,
        authProvider: user.authProvider
      },
      token
    });
  } catch (error) {
    console.error('Login error details:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Login failed.', details: error.message });
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ where: { emailVerificationToken: token } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null
    });

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    // TODO: Send email with reset link
    // This requires email service integration (SendGrid, AWS SES, etc.)
    // For now, just return the token (in production, send via email)
    res.json({
      message: 'Password reset link sent to your email.',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    await user.update({
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'emailVerificationToken', 'resetPasswordToken'] }
    });

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, profilePicture } = req.body;

    const user = await User.findByPk(req.user.id);
    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      bio: bio || user.bio,
      profilePicture: profilePicture || user.profilePicture
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profile update failed.' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Update password (will be hashed by beforeUpdate hook)
    await user.update({
      password: newPassword,
      isPasswordChangeRequired: false // Remove password change requirement after change
    });

    res.json({
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed.' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword
};
