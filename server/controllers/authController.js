import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';


export const register = async (req, res) => {
  try {
    const { accountType, email, password, personalInfo, companyInfo } = req.body;
    // Safety: ensure experience is always an array
      if (
        personalInfo &&
        personalInfo.experience &&
        !Array.isArray(personalInfo.experience)
      ) {
        personalInfo.experience = [];
      }

    // new added 
    // Fix bad experience/skill values for job seeker
    if (accountType === 'job_seeker') {
      if (!personalInfo.experience || typeof personalInfo.experience === 'string') {
        personalInfo.experience = [];
      }
      if (!personalInfo.skills || typeof personalInfo.skills === 'string') {
        personalInfo.skills = [];
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      accountType,
      email,
      password: hashedPassword,
      personalInfo: accountType === 'job_seeker' ? personalInfo : {},
      companyInfo: accountType === 'organization' ? companyInfo : {},
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id, accountType: newUser.accountType }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      accountType: newUser.accountType,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, accountType: user.accountType }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      accountType: user.accountType,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Forgot Password
// --------------------
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user with that email.' });

    // Create reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Save hashed token & expiration to DB
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min expiry

    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // For demo, just log to console
    console.log(`🔗 Reset link: ${resetUrl}`);

    res.json({
      message: 'Password reset link generated. Check console for the link.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating reset link.' });
  }
};

// --------------------
// Reset Password
// --------------------
export const resetPassword = async (req, res) => {
  const resetToken = req.params.token;
  const { newPassword } = req.body;

  try {
    // Hash token to match DB
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // still valid
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error resetting password.' });
  }
};


