import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("❌ Missing Cloudinary environment variables!");
  console.error("Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'transit-app/attractions', // Folder name in Cloudinary
    format: async (req, file) => {
      // Preserve original file extension
      const ext = file.originalname.split('.').pop();
      return ext || 'jpg';
    },
    public_id: (req, file) => {
      // Generate unique filename
      const ext = file.originalname.split('.').pop();
      const base = file.originalname.replace(/[^a-z0-9_-]/gi, "_").replace(/\.[^/.]+$/, "");
      return `${base}_${Date.now()}`;
    }
  }
});

export { cloudinary, storage };