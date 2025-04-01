import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Definimos la interfaz para extender Express.Multer.File
interface OptimizedFile extends Express.Multer.File {
  optimizedPath?: string;
}

// Aseguramos que exista el directorio para las imágenes optimizadas
const optimizedDir = path.join(process.cwd(), 'uploads', 'optimized');
if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

/**
 * Middleware para optimizar imágenes subidas
 */
async function optimizeImage(req: Request, res: Response, next: NextFunction) {
  // Si no hay archivo, continuar
  if (!req.file) {
    return next();
  }

  try {
    const file = req.file as OptimizedFile;
    const filename = `optimized_${Date.now()}_${path.basename(file.originalname)}`;
    const outputPath = path.join(optimizedDir, filename);

    // Procesar la imagen con sharp
    await sharp(file.buffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath);

    // Adjuntar la ruta optimizada al objeto file
    file.optimizedPath = outputPath;
    
    next();
  } catch (error) {
    console.error('Error optimizando imagen:', error);
    // En caso de error, continuamos sin optimizar
    next();
  }
}

export default optimizeImage;