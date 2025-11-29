import express from 'express';
import { getProfile, updateProfile, getProfileDetails, saveProfile } from '../controllers/userController.js';
import { addSkill, updateSkill, deleteSkill } from '../controllers/skillController.js';
import { addExperience, updateExperience, deleteExperience } from '../controllers/experienceController.js';
import { uploadProfilePhoto, uploadResume } from '../controllers/uploadController.js';
import { uploadProfilePhoto as uploadPhotoMiddleware, uploadResume as uploadResumeMiddleware } from '../middleware/uploadMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
// Profile routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/profile/details', authMiddleware, getProfileDetails);
router.post('/profile/save', authMiddleware, saveProfile);

// Upload routes (error handling is now in middleware)
router.post('/profile/photo', authMiddleware, uploadPhotoMiddleware, uploadProfilePhoto);
router.post('/resume', authMiddleware, uploadResumeMiddleware, uploadResume);

// Skills routes
router.post('/skills', authMiddleware, addSkill);
router.put('/skills/:id', authMiddleware, updateSkill);
router.delete('/skills/:id', authMiddleware, deleteSkill);

// Experience routes
router.post('/experience', authMiddleware, addExperience);
router.put('/experience/:id', authMiddleware, updateExperience);
router.delete('/experience/:id', authMiddleware, deleteExperience);

export default router;

