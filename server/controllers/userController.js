import User from '../models/User.js';
import Application from '../models/Application.js';
import Session from '../models/Session.js';

// Helper function to validate URL
const isValidUrl = (string) => {
  if (!string || string.trim() === '') return true; // Allow empty string
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

// GET /api/user/profile - Fetch job seeker profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is a job seeker
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountType !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Job seeker account required.'
      });
    }

    // Ensure experience is always an array (handle legacy string data)
    let experience = user.personalInfo?.experience || [];
    if (typeof experience === 'string') {
      experience = [];
    }
    if (!Array.isArray(experience)) {
      experience = [];
    }

    // Return profile data
    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        personalInfo: {
          fullName: user.personalInfo?.fullName || '',
          skills: user.personalInfo?.skills || [],
          experience: experience,
          resumeUrl: user.personalInfo?.resumeUrl || ''
        }
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// PUT /api/user/profile - Update job seeker profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, skills, experience, resumeUrl } = req.body;

    // Verify user is a job seeker
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountType !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Job seeker account required.'
      });
    }

    // Validation errors array
    const errors = [];

    // Validate fullName
    if (fullName !== undefined) {
      if (typeof fullName !== 'string') {
        errors.push('Full name must be a string');
      } else if (fullName.length > 100) {
        errors.push('Full name must be less than 100 characters');
      }
    }

    // Validate skills (comma-separated string)
    let skillsArray = [];
    if (skills !== undefined) {
      if (typeof skills !== 'string') {
        errors.push('Skills must be a string');
      } else {
        // Trim and filter empty strings
        skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    }

    // Experience is now an array, not a string - skip validation for this endpoint
    // This endpoint is deprecated in favor of experience CRUD endpoints

    // Validate resumeUrl
    if (resumeUrl !== undefined) {
      if (typeof resumeUrl !== 'string') {
        errors.push('Resume URL must be a string');
      } else if (!isValidUrl(resumeUrl)) {
        errors.push('Resume URL must be a valid URL (http:// or https://)');
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Update user profile
    if (!user.personalInfo) {
      user.personalInfo = {};
    }

    if (fullName !== undefined) {
      user.personalInfo.fullName = fullName.trim();
    }
    if (skills !== undefined) {
      user.personalInfo.skills = skillsArray;
    }
    // Experience is now managed via CRUD endpoints, don't update here
    // Ensure experience is always an array if it exists
    if (!user.personalInfo.experience || typeof user.personalInfo.experience === 'string') {
      user.personalInfo.experience = [];
    }
    if (resumeUrl !== undefined) {
      user.personalInfo.resumeUrl = resumeUrl.trim();
    }

    await user.save();

    // Return updated profile (exclude password)
    const updatedUser = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({
      success: true,
      data: {
        email: updatedUser.email,
        personalInfo: {
          fullName: updatedUser.personalInfo?.fullName || '',
          skills: updatedUser.personalInfo?.skills || [],
          experience: updatedUser.personalInfo?.experience || '',
          resumeUrl: updatedUser.personalInfo?.resumeUrl || ''
        }
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// GET /api/user/profile/details - Fetch full profile with metrics
export const getProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is a job seeker
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountType !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Job seeker account required.'
      });
    }

    // Get metrics
    const applicationsCount = await Application.countDocuments({ jobSeeker: userId });
    const approvedApplications = await Application.find({
      jobSeeker: userId,
      status: 'Approved'
    }).select('session');
    const sessionIds = approvedApplications.map(app => app.session);
    const sessionsCount = await Session.countDocuments({
      _id: { $in: sessionIds },
      date: { $gte: new Date() },
      status: 'Active'
    });

    // Ensure experience is always an array (handle legacy string data)
    let experience = user.personalInfo?.experience || [];
    if (typeof experience === 'string') {
      experience = [];
    }
    if (!Array.isArray(experience)) {
      experience = [];
    }

    // Ensure skills is always an array
    let skills = user.personalInfo?.skills || [];
    if (!Array.isArray(skills)) {
      skills = [];
    }

    // Return full profile data
    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        personalInfo: {
          fullName: user.personalInfo?.fullName || '',
          emailAddress: user.personalInfo?.emailAddress || user.email || '',
          phoneNumber: user.personalInfo?.phoneNumber || '',
          bio: user.personalInfo?.bio || '',
          profilePhotoUrl: user.personalInfo?.profilePhotoUrl || '',
          skills: skills,
          experience: experience,
          resumeUrl: user.personalInfo?.resumeUrl || ''
        },
        metrics: {
          applicationsCount,
          sessionsCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching profile details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile details',
      error: error.message
    });
  }
};

// POST /api/user/profile/save - Save profile (update personal info)
export const saveProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, emailAddress, phoneNumber, bio, profilePhotoUrl } = req.body;

    // Verify user is a job seeker
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountType !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Job seeker account required.'
      });
    }

    // Validation errors array
    const errors = [];

    // Validate fullName
    if (fullName !== undefined) {
      if (typeof fullName !== 'string') {
        errors.push('Full name must be a string');
      } else if (fullName.trim().length > 100) {
        errors.push('Full name must be less than 100 characters');
      }
    }

    // Validate emailAddress
    if (emailAddress !== undefined) {
      if (typeof emailAddress !== 'string') {
        errors.push('Email address must be a string');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailAddress.trim().length > 0 && !emailRegex.test(emailAddress.trim())) {
          errors.push('Email address must be a valid email format');
        }
      }
    }

    // Validate phoneNumber
    if (phoneNumber !== undefined) {
      if (typeof phoneNumber !== 'string') {
        errors.push('Phone number must be a string');
      }
      // Optional: Add phone validation regex if needed
    }

    // Validate bio
    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        errors.push('Bio must be a string');
      } else if (bio.length > 500) {
        errors.push('Bio must be less than 500 characters');
      }
    }

    // Validate profilePhotoUrl
    if (profilePhotoUrl !== undefined) {
      if (typeof profilePhotoUrl !== 'string') {
        errors.push('Profile photo URL must be a string');
      } else if (profilePhotoUrl.trim().length > 0 && !isValidUrl(profilePhotoUrl)) {
        errors.push('Profile photo URL must be a valid URL (http:// or https://)');
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Update user profile (only changed fields)
    if (!user.personalInfo) {
      user.personalInfo = {};
    }

    // Ensure experience and skills are always arrays (handle legacy data)
    if (!user.personalInfo.experience || typeof user.personalInfo.experience === 'string') {
      user.personalInfo.experience = [];
    }
    if (!user.personalInfo.skills || !Array.isArray(user.personalInfo.skills)) {
      user.personalInfo.skills = [];
    }

    if (fullName !== undefined) {
      user.personalInfo.fullName = fullName.trim();
    }
    if (emailAddress !== undefined) {
      user.personalInfo.emailAddress = emailAddress.trim();
    }
    if (phoneNumber !== undefined) {
      user.personalInfo.phoneNumber = phoneNumber.trim();
    }
    if (bio !== undefined) {
      user.personalInfo.bio = bio.trim();
    }
    if (profilePhotoUrl !== undefined) {
      user.personalInfo.profilePhotoUrl = profilePhotoUrl.trim();
    }

    await user.save();

    // Return updated profile (exclude password)
    const updatedUser = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({
      success: true,
      data: {
        email: updatedUser.email,
        personalInfo: {
          fullName: updatedUser.personalInfo?.fullName || '',
          emailAddress: updatedUser.personalInfo?.emailAddress || updatedUser.email || '',
          phoneNumber: updatedUser.personalInfo?.phoneNumber || '',
          bio: updatedUser.personalInfo?.bio || '',
          profilePhotoUrl: updatedUser.personalInfo?.profilePhotoUrl || '',
          skills: updatedUser.personalInfo?.skills || [],
          experience: updatedUser.personalInfo?.experience || [],
          resumeUrl: updatedUser.personalInfo?.resumeUrl || ''
        }
      },
      message: 'Profile saved successfully'
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving profile',
      error: error.message
    });
  }
};

