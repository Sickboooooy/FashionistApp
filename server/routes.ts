import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertUserPreferencesSchema,
  insertGarmentSchema, 
  insertOutfitSchema,
  insertSeleneDesignSchema,
  UserPreferences
} from "@shared/schema";
import { generateOutfitSuggestions, analyzeGarmentImage, generateOutfitsFromImage } from "./services/openai-service";
import { generateMagazineContent } from "./services/magazine-service";
import { saveBase64Image, deleteImage, ensureUploadsDir } from "./services/image-service";

// Función de ayuda para convertir null a undefined en las preferencias
function formatPreferences(prefs: UserPreferences | undefined) {
  if (!prefs) return undefined;
  
  return {
    styles: prefs.styles || undefined,
    occasions: prefs.occasions || undefined,
    seasons: prefs.seasons || undefined
  };
}

// Setup file upload with multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Ensure uploads directory exists
ensureUploadsDir();

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userInput = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userInput);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });

  // User preferences routes
  app.get("/api/users/:userId/preferences", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const preferences = await storage.getUserPreferences(userId);
    if (preferences) {
      res.json(preferences);
    } else {
      res.status(404).json({ message: "Preferences not found" });
    }
  });

  app.post("/api/users/:userId/preferences", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const preferencesInput = insertUserPreferencesSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if preferences already exist
      const existingPrefs = await storage.getUserPreferences(userId);
      
      if (existingPrefs) {
        // Update existing preferences
        const updatedPrefs = await storage.updateUserPreferences(existingPrefs.id, preferencesInput);
        res.json(updatedPrefs);
      } else {
        // Create new preferences
        const preferences = await storage.createUserPreferences(preferencesInput);
        res.status(201).json(preferences);
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Garment routes
  app.get("/api/users/:userId/garments", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const garments = await storage.getGarmentsByUserId(userId);
    res.json(garments);
  });

  app.post("/api/garments", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const garmentData = JSON.parse(req.body.data);
      const garmentInput = insertGarmentSchema.parse(garmentData);
      
      // Save image if provided
      if (req.file) {
        const base64Image = req.file.buffer.toString("base64");
        const imageUrl = saveBase64Image(base64Image);
        garmentInput.imageUrl = imageUrl;
      }
      
      const garment = await storage.createGarment(garmentInput);
      res.status(201).json(garment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // API endpoint for image analysis
  app.post("/api/analyze-garment", upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      
      const base64Image = req.file.buffer.toString("base64");
      const analysis = await analyzeGarmentImage(base64Image);
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/garments/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const garment = await storage.getGarment(id);
    if (garment) {
      res.json(garment);
    } else {
      res.status(404).json({ message: "Garment not found" });
    }
  });

  app.put("/api/garments/:id", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const garmentData = req.body.data ? JSON.parse(req.body.data) : req.body;
      
      // Validate garment data
      const updateInput = insertGarmentSchema.partial().parse(garmentData);
      
      // Save new image if provided
      if (req.file) {
        const base64Image = req.file.buffer.toString("base64");
        const imageUrl = saveBase64Image(base64Image);
        updateInput.imageUrl = imageUrl;
        
        // Delete old image if it exists
        const existingGarment = await storage.getGarment(id);
        if (existingGarment?.imageUrl) {
          deleteImage(existingGarment.imageUrl);
        }
      }
      
      const updatedGarment = await storage.updateGarment(id, updateInput);
      
      if (updatedGarment) {
        res.json(updatedGarment);
      } else {
        res.status(404).json({ message: "Garment not found" });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/garments/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    // Get garment to delete its image
    const garment = await storage.getGarment(id);
    if (garment?.imageUrl) {
      deleteImage(garment.imageUrl);
    }
    
    const result = await storage.deleteGarment(id);
    if (result) {
      res.status(204).end();
    } else {
      res.status(404).json({ message: "Garment not found" });
    }
  });

  // Outfit routes
  app.get("/api/users/:userId/outfits", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const outfits = await storage.getOutfitsByUserId(userId);
    res.json(outfits);
  });

  app.post("/api/outfits", async (req: Request, res: Response) => {
    try {
      const outfitInput = insertOutfitSchema.parse(req.body);
      const outfit = await storage.createOutfit(outfitInput);
      res.status(201).json(outfit);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/outfits/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const outfit = await storage.getOutfit(id);
    if (outfit) {
      res.json(outfit);
    } else {
      res.status(404).json({ message: "Outfit not found" });
    }
  });

  app.put("/api/outfits/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateInput = insertOutfitSchema.partial().parse(req.body);
      const updatedOutfit = await storage.updateOutfit(id, updateInput);
      
      if (updatedOutfit) {
        res.json(updatedOutfit);
      } else {
        res.status(404).json({ message: "Outfit not found" });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/outfits/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const result = await storage.deleteOutfit(id);
    if (result) {
      res.status(204).end();
    } else {
      res.status(404).json({ message: "Outfit not found" });
    }
  });

  app.post("/api/outfits/:id/save", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const savedOutfit = await storage.saveOutfit(id);
    
    if (savedOutfit) {
      res.json(savedOutfit);
    } else {
      res.status(404).json({ message: "Outfit not found" });
    }
  });

  // Selene Designs routes
  app.get("/api/selene-designs", async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    
    if (category) {
      const designs = await storage.getSeleneDesignsByCategory(category);
      res.json(designs);
    } else {
      const designs = await storage.getAllSeleneDesigns();
      res.json(designs);
    }
  });

  app.get("/api/selene-designs/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const design = await storage.getSeleneDesign(id);
    
    if (design) {
      res.json(design);
    } else {
      res.status(404).json({ message: "Design not found" });
    }
  });

  app.post("/api/selene-designs", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const designData = req.body.data ? JSON.parse(req.body.data) : req.body;
      const designInput = insertSeleneDesignSchema.parse(designData);
      
      // Save image if provided
      if (req.file) {
        const base64Image = req.file.buffer.toString("base64");
        const imageUrl = saveBase64Image(base64Image);
        designInput.imageUrl = imageUrl;
      }
      
      const design = await storage.createSeleneDesign(designInput);
      res.status(201).json(design);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Generate outfit recommendations
  app.post("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        userId: z.number().optional(),
        garmentIds: z.array(z.number()).optional(),
        textPrompt: z.string().optional(),
        season: z.string().optional(),
        occasion: z.string().optional()
      });
      
      const request = requestSchema.parse(req.body);
      
      // Get user preferences if userId provided
      let userPreferences;
      if (request.userId) {
        userPreferences = await storage.getUserPreferences(request.userId);
      }
      
      // Get garments if garmentIds provided
      let garments;
      if (request.garmentIds && request.garmentIds.length > 0) {
        garments = await Promise.all(
          request.garmentIds.map(id => storage.getGarment(id))
        );
        // Filter out undefined garments
        garments = garments.filter(g => g !== undefined);
      }
      
      // Generate outfit suggestions
      const suggestions = await generateOutfitSuggestions({
        garments,
        preferences: formatPreferences(userPreferences),
        textPrompt: request.textPrompt,
        season: request.season,
        occasion: request.occasion
      });
      
      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // New endpoint for generating outfits from a garment image
  app.post("/api/generate-outfits", upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No image uploaded" });
      }

      // Read the uploaded image file
      const base64Image = req.file.buffer.toString('base64');
      
      // Get user preferences from the request body if available
      const preferences = req.body.preferences ? JSON.parse(req.body.preferences) : undefined;
      
      // Generate outfit suggestions using OpenAI
      const outfitSuggestions = await generateOutfitsFromImage(base64Image, preferences);
      
      // Return the generated outfit suggestions
      res.json({
        success: true, 
        outfits: outfitSuggestions.map((outfit, index) => ({
          id: index + 1,
          name: outfit.name,
          description: outfit.description,
          occasion: outfit.occasion,
          season: outfit.season || "Any",
          pieces: outfit.pieces,
          reasoning: outfit.reasoning,
          imageUrl: "" // Placeholder for future image generation
        }))
      });
    } catch (error: any) {
      console.error("Error generating outfits:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "An error occurred while generating outfits" 
      });
    }
  });

  // Generate magazine content
  app.post("/api/generate-magazine", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        outfits: z.array(z.object({
          id: z.number(),
          name: z.string(),
          description: z.string(),
          occasion: z.string(),
          season: z.string().optional(),
          pieces: z.array(z.string()).optional(),
          reasoning: z.string().optional(),
          imageUrl: z.string().optional()
        })),
        template: z.string(),
        userPreferences: z.object({
          styles: z.array(z.string()).optional(),
          occasions: z.array(z.object({
            name: z.string(),
            priority: z.number()
          })).optional(),
          seasons: z.array(z.string()).optional()
        }).optional(),
        userId: z.number().optional(),
        userName: z.string().optional()
      });
      
      // Validate the request body
      const request = requestSchema.parse(req.body);
      
      // Get user preferences if userId provided and not already in request
      let userPreferences = request.userPreferences;
      if (!userPreferences && request.userId) {
        userPreferences = formatPreferences(await storage.getUserPreferences(request.userId));
      }
      
      // Generate magazine content
      const magazineContent = await generateMagazineContent({
        outfits: request.outfits,
        template: request.template,
        userPreferences,
        userName: request.userName
      });
      
      res.json(magazineContent);
    } catch (error: any) {
      console.error("Error generando contenido de revista:", error);
      res.status(500).json({
        error: error.message || "Error al generar el contenido de la revista"
      });
    }
  });
  
  // Export magazine to PDF
  app.post("/api/export-magazine-pdf", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        content: z.object({
          title: z.string(),
          subtitle: z.string(),
          introduction: z.string(),
          outfits: z.array(z.object({
            id: z.number(),
            name: z.string(),
            description: z.string(),
            occasion: z.string(),
            season: z.string().optional(),
            imageUrl: z.string().optional(),
            editorial: z.string()
          })),
          conclusion: z.string(),
          template: z.string()
        }),
        isPremiumUser: z.boolean().optional()
      });
      
      // Validate the request body
      const request = requestSchema.parse(req.body);
      
      // En una implementación real, aquí generaríamos un PDF con una biblioteca como PDFKit
      // Por ahora, simplemente devolvemos un PDF vacío con el nombre correcto
      
      // Crear un buffer simple para simular un PDF
      const buffer = Buffer.from("PDF simulado para " + request.content.title);
      
      // Configurar la respuesta para descargar el PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${request.content.title.replace(/\s+/g, '_').toLowerCase()}_magazine.pdf"`);
      
      // Enviar el buffer como respuesta
      res.send(buffer);
    } catch (error: any) {
      console.error("Error exportando revista a PDF:", error);
      res.status(500).json({
        error: error.message || "Error al exportar la revista a PDF"
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
