import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity } from "./middleware/security";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes";

// 🚨 Global Error Handlers
process.on('uncaughtException', (error) => {
  log(`🚨 UNCAUGHT EXCEPTION: ${error.stack || error}`, 'fatal-error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`🚨 UNHANDLED REJECTION: ${reason}`, 'fatal-error');
  // Optionally, you can log the promise that was rejected
  // console.error('Unhandled Rejection at:', promise);
  process.exit(1);
});

const app = express();
// Habilitar trust proxy para que express-rate-limit funcione correctamente con X-Forwarded-For
app.set('trust proxy', true);
app.use(compression()); // Compresión para todas las respuestas
app.use(express.json({ limit: '10mb' })); // Límite de tamaño para peticiones JSON
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configurar middlewares de seguridad
setupSecurity(app);

// Middleware específico para SVGs
app.use('/uploads/*.svg', (req, res, next) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
});

// Servir la carpeta uploads estáticamente
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the configured port (defaults to 5000)
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`, 'express');
  });
})();
