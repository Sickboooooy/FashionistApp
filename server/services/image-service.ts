import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory in the dist folder
const uploadsDir = path.join(__dirname, '..', '..', 'dist', 'public', 'uploads');

// Ensure the uploads directory exists
export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Save base64 image and return the URL
export function saveBase64Image(base64Data: string): string {
  ensureUploadsDir();
  
  // Remove the data:image/jpeg;base64, part
  const base64Image = base64Data.split(';base64,').pop() || '';
  
  // Generate a unique filename
  const filename = `${crypto.randomUUID()}.jpg`;
  const filePath = path.join(uploadsDir, filename);
  
  // Save the file
  fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });
  
  // Return the relative URL to the file
  return `/uploads/${filename}`;
}

// Delete image
export function deleteImage(imageUrl: string): boolean {
  if (!imageUrl.startsWith('/uploads/')) {
    return false;
  }
  
  const filename = imageUrl.split('/').pop();
  if (!filename) return false;
  
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  
  return false;
}

// Get a buffer from an image URL
export function getImageBuffer(imageUrl: string): Buffer | null {
  if (!imageUrl.startsWith('/uploads/')) {
    return null;
  }
  
  const filename = imageUrl.split('/').pop();
  if (!filename) return null;
  
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  
  return null;
}
