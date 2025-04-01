import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Middleware de validación para generación de outfits
 */
export const validateOutfitGeneration = [
  body('preferences').optional().isObject(),
  body('textPrompt').optional().isString(),
  body('season').optional().isString(),
  body('occasion').optional().isString(),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Si no hay imagen ni texto, devolver error
    if (!req.file && !req.body.textPrompt) {
      return res.status(400).json({ 
        error: "Se requiere una imagen o un prompt de texto para generar outfits" 
      });
    }
    
    next();
  }
];

/**
 * Middleware de validación para generación de revista
 */
export const validateMagazineGeneration = [
  body('outfits').isArray().withMessage('Se requiere un array de outfits'),
  body('outfits.*.id').isNumeric().withMessage('ID de outfit inválido'),
  body('outfits.*.name').isString().withMessage('Nombre de outfit inválido'),
  body('outfits.*.description').isString().withMessage('Descripción de outfit inválida'),
  body('outfits.*.occasion').isString().withMessage('Ocasión de outfit inválida'),
  body('template').isString().withMessage('Se requiere una plantilla'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Validar que no haya más de 4 outfits
    if (req.body.outfits && req.body.outfits.length > 4) {
      return res.status(400).json({ 
        error: "La revista no puede contener más de 4 outfits" 
      });
    }
    
    next();
  }
];

/**
 * Middleware de validación para análisis de imagen
 */
export const validateImageAnalysis = [
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({ 
        error: "Se requiere una imagen para el análisis" 
      });
    }
    
    // Validar tipo de imagen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: "Formato de imagen no soportado. Use JPEG, PNG o WebP" 
      });
    }
    
    // Validar tamaño de imagen (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: "La imagen es demasiado grande. El tamaño máximo es 5MB" 
      });
    }
    
    next();
  }
];