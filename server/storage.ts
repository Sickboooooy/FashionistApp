import { 
  users, User, InsertUser, 
  garments, Garment, InsertGarment,
  outfits, Outfit, InsertOutfit,
  userPreferences, UserPreferences, InsertUserPreferences,
  seleneDesigns, SeleneDesign, InsertSeleneDesign
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User preferences methods
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(id: number, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;
  
  // Garment methods
  getGarment(id: number): Promise<Garment | undefined>;
  getGarmentsByUserId(userId: number): Promise<Garment[]>;
  createGarment(garment: InsertGarment): Promise<Garment>;
  updateGarment(id: number, garment: Partial<InsertGarment>): Promise<Garment | undefined>;
  deleteGarment(id: number): Promise<boolean>;
  
  // Outfit methods
  getOutfit(id: number): Promise<Outfit | undefined>;
  getOutfitsByUserId(userId: number): Promise<Outfit[]>;
  createOutfit(outfit: InsertOutfit): Promise<Outfit>;
  updateOutfit(id: number, outfit: Partial<InsertOutfit>): Promise<Outfit | undefined>;
  deleteOutfit(id: number): Promise<boolean>;
  saveOutfit(id: number): Promise<Outfit | undefined>;
  
  // Selene designs methods
  getSeleneDesign(id: number): Promise<SeleneDesign | undefined>;
  getAllSeleneDesigns(): Promise<SeleneDesign[]>;
  getSeleneDesignsByCategory(category: string): Promise<SeleneDesign[]>;
  createSeleneDesign(design: InsertSeleneDesign): Promise<SeleneDesign>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private garments: Map<number, Garment>;
  private outfits: Map<number, Outfit>;
  private userPreferences: Map<number, UserPreferences>;
  private seleneDesigns: Map<number, SeleneDesign>;
  
  private currentUserId: number;
  private currentGarmentId: number;
  private currentOutfitId: number;
  private currentPreferencesId: number;
  private currentDesignId: number;

  constructor() {
    this.users = new Map();
    this.garments = new Map();
    this.outfits = new Map();
    this.userPreferences = new Map();
    this.seleneDesigns = new Map();
    
    this.currentUserId = 1;
    this.currentGarmentId = 1;
    this.currentOutfitId = 1;
    this.currentPreferencesId = 1;
    this.currentDesignId = 1;
    
    // Initialize with some demo Selene designs
    this.initializeSeleneDesigns();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const timestamp = new Date();
    const user: User = { ...insertUser, id, createdAt: timestamp };
    this.users.set(id, user);
    return user;
  }
  
  // User preferences methods
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return Array.from(this.userPreferences.values()).find(
      (prefs) => prefs.userId === userId
    );
  }
  
  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const id = this.currentPreferencesId++;
    const userPrefs: UserPreferences = { ...preferences, id };
    this.userPreferences.set(id, userPrefs);
    return userPrefs;
  }
  
  async updateUserPreferences(id: number, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const existingPrefs = this.userPreferences.get(id);
    if (!existingPrefs) return undefined;
    
    const updatedPrefs: UserPreferences = { ...existingPrefs, ...preferences };
    this.userPreferences.set(id, updatedPrefs);
    return updatedPrefs;
  }
  
  // Garment methods
  async getGarment(id: number): Promise<Garment | undefined> {
    return this.garments.get(id);
  }
  
  async getGarmentsByUserId(userId: number): Promise<Garment[]> {
    return Array.from(this.garments.values()).filter(
      (garment) => garment.userId === userId
    );
  }
  
  async createGarment(garment: InsertGarment): Promise<Garment> {
    const id = this.currentGarmentId++;
    const timestamp = new Date();
    const newGarment: Garment = { ...garment, id, createdAt: timestamp };
    this.garments.set(id, newGarment);
    return newGarment;
  }
  
  async updateGarment(id: number, garment: Partial<InsertGarment>): Promise<Garment | undefined> {
    const existingGarment = this.garments.get(id);
    if (!existingGarment) return undefined;
    
    const updatedGarment: Garment = { ...existingGarment, ...garment };
    this.garments.set(id, updatedGarment);
    return updatedGarment;
  }
  
  async deleteGarment(id: number): Promise<boolean> {
    return this.garments.delete(id);
  }
  
  // Outfit methods
  async getOutfit(id: number): Promise<Outfit | undefined> {
    return this.outfits.get(id);
  }
  
  async getOutfitsByUserId(userId: number): Promise<Outfit[]> {
    return Array.from(this.outfits.values()).filter(
      (outfit) => outfit.userId === userId
    );
  }
  
  async createOutfit(outfit: InsertOutfit): Promise<Outfit> {
    const id = this.currentOutfitId++;
    const timestamp = new Date();
    const newOutfit: Outfit = { ...outfit, id, createdAt: timestamp };
    this.outfits.set(id, newOutfit);
    return newOutfit;
  }
  
  async updateOutfit(id: number, outfit: Partial<InsertOutfit>): Promise<Outfit | undefined> {
    const existingOutfit = this.outfits.get(id);
    if (!existingOutfit) return undefined;
    
    const updatedOutfit: Outfit = { ...existingOutfit, ...outfit };
    this.outfits.set(id, updatedOutfit);
    return updatedOutfit;
  }
  
  async deleteOutfit(id: number): Promise<boolean> {
    return this.outfits.delete(id);
  }
  
  async saveOutfit(id: number): Promise<Outfit | undefined> {
    const existingOutfit = this.outfits.get(id);
    if (!existingOutfit) return undefined;
    
    const savedOutfit: Outfit = { ...existingOutfit, isSaved: true };
    this.outfits.set(id, savedOutfit);
    return savedOutfit;
  }
  
  // Selene designs methods
  async getSeleneDesign(id: number): Promise<SeleneDesign | undefined> {
    return this.seleneDesigns.get(id);
  }
  
  async getAllSeleneDesigns(): Promise<SeleneDesign[]> {
    return Array.from(this.seleneDesigns.values());
  }
  
  async getSeleneDesignsByCategory(category: string): Promise<SeleneDesign[]> {
    return Array.from(this.seleneDesigns.values()).filter(
      (design) => design.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  async createSeleneDesign(design: InsertSeleneDesign): Promise<SeleneDesign> {
    const id = this.currentDesignId++;
    const timestamp = new Date();
    const newDesign: SeleneDesign = { ...design, id, createdAt: timestamp };
    this.seleneDesigns.set(id, newDesign);
    return newDesign;
  }
  
  // Initialize with some demo Selene designs
  private initializeSeleneDesigns() {
    const designs: InsertSeleneDesign[] = [
      {
        name: "Pearl Stilettos",
        description: "Handcrafted stiletto heels with pearl embellishments",
        category: "Footwear",
        imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Embroidered Blouse",
        description: "Silk blouse with intricate hand embroidery",
        category: "Blouses",
        imageUrl: "https://images.unsplash.com/photo-1551232864-3f0890e580d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Pearl Statement",
        description: "Luxury pearl necklace with gold accents",
        category: "Accessories",
        imageUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Evening Clutch",
        description: "Handcrafted evening clutch with pearl embellishments",
        category: "Accessories",
        imageUrl: "https://images.unsplash.com/photo-1560343776-97e7d202ff0e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      }
    ];
    
    designs.forEach(design => {
      const id = this.currentDesignId++;
      const timestamp = new Date();
      this.seleneDesigns.set(id, { ...design, id, createdAt: timestamp });
    });
  }
}

export const storage = new MemStorage();
