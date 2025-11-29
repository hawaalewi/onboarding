import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  accountType: {
    type: String,
    enum: ['job_seeker', 'organization'],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  // Personal info for Job Seeker
  personalInfo: {
    fullName: String,
    emailAddress: String, // Can be different from login email
    phoneNumber: String,
    bio: String,
    profilePhotoUrl: String,
    skills: [String],
    experience: {
      type: [
        {
          company: String,
          startDate: Date,
          endDate: Date,
          description: String,
          isCurrent: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    
    resumeUrl: { type: String, default: "" } // <-- COMMA added
  },

  // Company info for Organization
  companyInfo: {
    companyName: String,
    industry: String,
    address: String,
    logoUrl: String,
  },

  // For password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;
