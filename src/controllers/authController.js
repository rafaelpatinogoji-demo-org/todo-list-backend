const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');

const f_register = async (p_req, p_res) => {
  try {
    const { name, email, password } = p_req.body;

    if (!name || !email || !password) {
      return p_res.status(400).json({ message: 'Name, email and password are required' });
    }

    const v_existingUser = await User.findOne({ email });
    if (v_existingUser) {
      return p_res.status(400).json({ message: 'User already exists' });
    }

    const v_saltRounds = 12;
    const v_hashedPassword = await bcrypt.hash(password, v_saltRounds);

    const v_emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const v_user = new User({
      name,
      email,
      password: v_hashedPassword,
      emailVerificationToken: v_emailVerificationToken
    });

    const v_savedUser = await v_user.save();

    console.log(`Email verification token for ${email}: ${v_emailVerificationToken}`);

    p_res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      userId: v_savedUser._id
    });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_login = async (p_req, p_res) => {
  try {
    const { email, password } = p_req.body;

    if (!email || !password) {
      return p_res.status(400).json({ message: 'Email and password are required' });
    }

    const v_user = await User.findOne({ email });
    if (!v_user) {
      return p_res.status(401).json({ message: 'Invalid credentials' });
    }

    const v_isPasswordValid = await bcrypt.compare(password, v_user.password);
    if (!v_isPasswordValid) {
      return p_res.status(401).json({ message: 'Invalid credentials' });
    }

    const v_accessToken = jwt.sign(
      { userId: v_user._id, email: v_user.email },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '15m' }
    );

    const v_refreshToken = jwt.sign(
      { userId: v_user._id },
      process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      { expiresIn: '7d' }
    );

    const v_session = new Session({
      user_id: v_user._id,
      jwt: v_accessToken,
      refreshToken: v_refreshToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await v_session.save();

    p_res.json({
      message: 'Login successful',
      accessToken: v_accessToken,
      refreshToken: v_refreshToken,
      user: {
        id: v_user._id,
        name: v_user.name,
        email: v_user.email,
        isEmailVerified: v_user.isEmailVerified
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_logout = async (p_req, p_res) => {
  try {
    const v_session = p_req.session;
    
    v_session.isActive = false;
    await v_session.save();

    p_res.json({ message: 'Logout successful' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_refreshToken = async (p_req, p_res) => {
  try {
    const { refreshToken } = p_req.body;

    if (!refreshToken) {
      return p_res.status(401).json({ message: 'Refresh token required' });
    }

    const v_decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'default_refresh_secret');
    
    const v_session = await Session.findOne({
      user_id: v_decoded.userId,
      refreshToken: refreshToken,
      isActive: true
    });

    if (!v_session) {
      return p_res.status(401).json({ message: 'Invalid refresh token' });
    }

    const v_user = await User.findById(v_decoded.userId);
    if (!v_user) {
      return p_res.status(401).json({ message: 'User not found' });
    }

    const v_newAccessToken = jwt.sign(
      { userId: v_user._id, email: v_user.email },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '15m' }
    );

    v_session.jwt = v_newAccessToken;
    v_session.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await v_session.save();

    p_res.json({
      accessToken: v_newAccessToken,
      user: {
        id: v_user._id,
        name: v_user.name,
        email: v_user.email,
        isEmailVerified: v_user.isEmailVerified
      }
    });
  } catch (p_error) {
    p_res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const f_verifyEmail = async (p_req, p_res) => {
  try {
    const { token } = p_req.params;

    const v_user = await User.findOne({ emailVerificationToken: token });
    if (!v_user) {
      return p_res.status(400).json({ message: 'Invalid verification token' });
    }

    v_user.isEmailVerified = true;
    v_user.emailVerificationToken = undefined;
    await v_user.save();

    p_res.json({ message: 'Email verified successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_requestPasswordReset = async (p_req, p_res) => {
  try {
    const { email } = p_req.body;

    if (!email) {
      return p_res.status(400).json({ message: 'Email is required' });
    }

    const v_user = await User.findOne({ email });
    if (!v_user) {
      return p_res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const v_resetToken = crypto.randomBytes(32).toString('hex');
    v_user.passwordResetToken = v_resetToken;
    v_user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await v_user.save();

    console.log(`Password reset token for ${email}: ${v_resetToken}`);

    p_res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_resetPassword = async (p_req, p_res) => {
  try {
    const { token } = p_req.params;
    const { password } = p_req.body;

    if (!password) {
      return p_res.status(400).json({ message: 'Password is required' });
    }

    const v_user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!v_user) {
      return p_res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const v_saltRounds = 12;
    const v_hashedPassword = await bcrypt.hash(password, v_saltRounds);

    v_user.password = v_hashedPassword;
    v_user.passwordResetToken = undefined;
    v_user.passwordResetExpires = undefined;
    await v_user.save();

    await Session.updateMany(
      { user_id: v_user._id },
      { isActive: false }
    );

    p_res.json({ message: 'Password reset successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_register,
  f_login,
  f_logout,
  f_refreshToken,
  f_verifyEmail,
  f_requestPasswordReset,
  f_resetPassword
};
