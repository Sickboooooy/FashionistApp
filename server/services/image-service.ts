import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directorio para guardar las imágenes subidas
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * Asegura que exista el directorio de uploads
 */
export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Guarda una imagen desde formato base64 y devuelve la URL
 */
export function saveBase64Image(base64Data: string): string {
  // Eliminar el prefijo de datos si existe
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  // Crear un nombre único para el archivo
  const filename = `${uuidv4()}.jpg`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  // Escribir el archivo
  fs.writeFileSync(filepath, Buffer.from(base64Image, 'base64'));
  
  // Devolver la ruta relativa para acceder a la imagen
  return `uploads/${filename}`;
}

/**
 * Elimina una imagen del sistema de archivos
 */
export function deleteImage(imageUrl: string): boolean {
  try {
    // Extraer el nombre de archivo de la URL
    const filename = imageUrl.split('/').pop();
    if (!filename) return false;
    
    const filepath = path.join(UPLOADS_DIR, filename);
    
    // Verificar si el archivo existe
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    return false;
  }
}

/**
 * Obtiene el buffer de una imagen por su URL
 */
export function getImageBuffer(imageUrl: string): Buffer | null {
  try {
    // Extraer el nombre de archivo de la URL
    const filename = imageUrl.split('/').pop();
    if (!filename) return null;
    
    const filepath = path.join(UPLOADS_DIR, filename);
    
    // Verificar si el archivo existe
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath);
    }
    
    return null;
  } catch (error) {
    console.error('Error leyendo imagen:', error);
    return null;
  }
}