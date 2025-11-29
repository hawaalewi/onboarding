import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

// Helper to convert buffer to stream
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// POST /api/user/profile/photo - Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is a job seeker
    const user = await User.findById(userId);
    if (!user || user.accountType !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Job seeker account required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old photo from Cloudinary if exists
    if (user.personalInfo?.profilePhotoUrl) {
      try {
        // Extract public_id from URL
        const urlParts = user.personalInfo.profilePhotoUrl.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0];
        const folder = 'onboarding_project/profile_photos';
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      } catch (error) {
        console.error('Error deleting old photo:', error);
        // Continue even if deletion fails
      }
    }

    // Upload to Cloudinary
    try {
      const stream = bufferToStream(req.file.buffer);
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'onboarding_project/profile_photos',
            transformation: [{ width: 400, height: 400, crop: 'fill' }],
            resource_type: 'image'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });

      // Update user profile
      if (!user.personalInfo) {
        user.personalInfo = {};
      }
      user.personalInfo.profilePhotoUrl = result.secure_url;
      await user.save();

      res.status(200).json({
        success: true,
        data: {
          profilePhotoUrl: result.secure_url
        },
        message: 'Profile photo uploaded successfully'
      });
    } catch (uploadError) {
      res.status(500).json({
        success: false,
        message: 'Error uploading to Cloudinary',
        error: uploadError.message
      });
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile photo',
      error: error.message
    });
  }
};

// POST /api/user/resume - Upload resume
export const uploadResume = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is a job seeker
    const user = await User.findById(userId);
    if (!user || user.accountType !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Job seeker account required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old resume from Cloudinary if exists
    if (user.personalInfo?.resumeUrl) {
      try {
        const urlParts = user.personalInfo.resumeUrl.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0];
        const folder = 'onboarding_project/resumes';
        await cloudinary.uploader.destroy(`${folder}/${publicId}`, { resource_type: 'raw' });
      } catch (error) {
        console.error('Error deleting old resume:', error);
        // Continue even if deletion fails
      }
    }

    // Upload to Cloudinary with original filename
    try {
      const stream = bufferToStream(req.file.buffer);
      // Extract original filename without extension for public_id
      const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');
      const timestamp = Date.now();
      const publicId = `onboarding_project/resumes/${timestamp}_${originalName}`;
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'onboarding_project/resumes',
            resource_type: 'raw',
            public_id: publicId,
            // Preserve original filename in context
            context: {
              filename: req.file.originalname
            }
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });

      // Update user profile
      if (!user.personalInfo) {
        user.personalInfo = {};
      }
      user.personalInfo.resumeUrl = result.secure_url;
      await user.save();

      res.status(200).json({
        success: true,
        data: {
          resumeUrl: result.secure_url
        },
        message: 'Resume uploaded successfully'
      });
    } catch (uploadError) {
      res.status(500).json({
        success: false,
        message: 'Error uploading to Cloudinary',
        error: uploadError.message
      });
    }
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading resume',
      error: error.message
    });
  }
};

