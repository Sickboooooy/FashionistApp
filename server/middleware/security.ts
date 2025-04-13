import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xssClean from 'xss-clean';

/**
 * Configura middlewares de seguridad en la aplicación Express
 */
export function setupSecurity(app: Express): void {
  // Configuración básica de Helmet para encabezados HTTP seguros
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.openai.com", "https://vitejs.dev", "wss:", "ws:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        workerSrc: ["'self'", "blob:"]
      }
    }
  }));

  // Limitar la tasa de solicitudes a 100 por 15 minutos
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 solicitudes por ventana
    standardHeaders: true, // Devuelve info de límite en encabezados `RateLimit-*`
    legacyHeaders: false, // Deshabilita los encabezados `X-RateLimit-*`
    message: { error: "Demasiadas solicitudes, por favor intente nuevamente después" },
    // En lugar de usar trustProxy, usamos keyGenerator personalizado
    // que considera la primera IP en X-Forwarded-For
    keyGenerator: (req, res) => {
      // Obtener la IP real del cliente en entornos como Replit
      const realIp = req.headers['x-forwarded-for'] as string;
      if (realIp) {
        return realIp.split(',')[0].trim();
      }
      return (req.ip || '').toString();
    }
  });
  
  // Aplicar límite a todas las rutas de API
  app.use('/api', apiLimiter);

  // Limitar las solicitudes a endpoints críticos como la autenticación
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // Máximo 10 solicitudes por hora
    message: { error: "Demasiados intentos, por favor intente nuevamente después" },
    // Usar el mismo keyGenerator personalizado
    keyGenerator: (req, res) => {
      const realIp = req.headers['x-forwarded-for'] as string;
      if (realIp) {
        return realIp.split(',')[0].trim();
      }
      return (req.ip || '').toString();
    }
  });
  
  // Aplicar limites más estrictos a rutas de IA intensivas
  app.use('/api/generate-outfits', authLimiter);
  app.use('/api/generate-magazine', authLimiter);
  
  // Prevenir ataques XSS (Cross-Site Scripting)
  app.use(xssClean());
  
  // Sanitizar datos antes de procesarlos
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Sanitizamos los parámetros de solicitud
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          // Simple sanitization example (could be more robust)
          req.query[key] = (req.query[key] as string).replace(/<[^>]*>?/gm, '');
        }
      });
    }
    next();
  });
}