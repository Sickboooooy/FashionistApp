import { 
  users, User, InsertUser, 
  garments, Garment, InsertGarment,
  outfits, Outfit, InsertOutfit,
  userPreferences, UserPreferences, InsertUserPreferences,
  seleneDesigns, SeleneDesign, InsertSeleneDesign,
  trips, Trip, InsertTrip,
  packingLists, PackingList, InsertPackingList,
  packingItems, PackingItem, InsertPackingItem
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
  
  // Trip planning methods
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUserId(userId: number): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // Packing list methods
  getPackingList(id: number): Promise<PackingList | undefined>;
  getPackingListsByTripId(tripId: number): Promise<PackingList[]>;
  createPackingList(packingList: InsertPackingList): Promise<PackingList>;
  updatePackingList(id: number, packingList: Partial<InsertPackingList>): Promise<PackingList | undefined>;
  deletePackingList(id: number): Promise<boolean>;
  
  // Packing items methods
  getPackingItem(id: number): Promise<PackingItem | undefined>;
  getPackingItemsByListId(packingListId: number): Promise<PackingItem[]>;
  createPackingItem(packingItem: InsertPackingItem): Promise<PackingItem>;
  updatePackingItem(id: number, packingItem: Partial<InsertPackingItem>): Promise<PackingItem | undefined>;
  deletePackingItem(id: number): Promise<boolean>;
  generatePackingListForTrip(tripId: number, userId: number): Promise<PackingList>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private garments: Map<number, Garment>;
  private outfits: Map<number, Outfit>;
  private userPreferences: Map<number, UserPreferences>;
  private seleneDesigns: Map<number, SeleneDesign>;
  private trips: Map<number, Trip>;
  private packingLists: Map<number, PackingList>;
  private packingItems: Map<number, PackingItem>;
  
  private currentUserId: number;
  private currentGarmentId: number;
  private currentOutfitId: number;
  private currentPreferencesId: number;
  private currentDesignId: number;
  private currentTripId: number;
  private currentPackingListId: number;
  private currentPackingItemId: number;

  constructor() {
    this.users = new Map();
    this.garments = new Map();
    this.outfits = new Map();
    this.userPreferences = new Map();
    this.seleneDesigns = new Map();
    this.trips = new Map();
    this.packingLists = new Map();
    this.packingItems = new Map();
    
    this.currentUserId = 1;
    this.currentGarmentId = 1;
    this.currentOutfitId = 1;
    this.currentPreferencesId = 1;
    this.currentDesignId = 1;
    this.currentTripId = 1;
    this.currentPackingListId = 1;
    this.currentPackingItemId = 1;
    
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
        description: "Urban fashion clutch with modern metallic details",
        category: "Accessories",
        imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=500&q=80"
      }
    ];
    
    designs.forEach(design => {
      const id = this.currentDesignId++;
      const timestamp = new Date();
      this.seleneDesigns.set(id, { ...design, id, createdAt: timestamp });
    });
  }
  
  // Trip methods
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }
  
  async getTripsByUserId(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.userId === userId
    );
  }
  
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const id = this.currentTripId++;
    const timestamp = new Date();
    const newTrip: Trip = { ...trip, id, createdAt: timestamp };
    this.trips.set(id, newTrip);
    return newTrip;
  }
  
  async updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined> {
    const existingTrip = this.trips.get(id);
    if (!existingTrip) return undefined;
    
    const updatedTrip: Trip = { ...existingTrip, ...trip };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }
  
  async deleteTrip(id: number): Promise<boolean> {
    // Eliminar también todas las listas de equipaje asociadas
    const packingLists = await this.getPackingListsByTripId(id);
    for (const list of packingLists) {
      await this.deletePackingList(list.id);
    }
    return this.trips.delete(id);
  }
  
  // Packing list methods
  async getPackingList(id: number): Promise<PackingList | undefined> {
    return this.packingLists.get(id);
  }
  
  async getPackingListsByTripId(tripId: number): Promise<PackingList[]> {
    return Array.from(this.packingLists.values()).filter(
      (list) => list.tripId === tripId
    );
  }
  
  async createPackingList(packingList: InsertPackingList): Promise<PackingList> {
    const id = this.currentPackingListId++;
    const timestamp = new Date();
    const newPackingList: PackingList = { ...packingList, id, createdAt: timestamp };
    this.packingLists.set(id, newPackingList);
    return newPackingList;
  }
  
  async updatePackingList(id: number, packingList: Partial<InsertPackingList>): Promise<PackingList | undefined> {
    const existingList = this.packingLists.get(id);
    if (!existingList) return undefined;
    
    const updatedList: PackingList = { ...existingList, ...packingList };
    this.packingLists.set(id, updatedList);
    return updatedList;
  }
  
  async deletePackingList(id: number): Promise<boolean> {
    // Eliminar también todos los items asociados
    const packingItems = await this.getPackingItemsByListId(id);
    for (const item of packingItems) {
      await this.deletePackingItem(item.id);
    }
    return this.packingLists.delete(id);
  }
  
  // Packing item methods
  async getPackingItem(id: number): Promise<PackingItem | undefined> {
    return this.packingItems.get(id);
  }
  
  async getPackingItemsByListId(packingListId: number): Promise<PackingItem[]> {
    return Array.from(this.packingItems.values()).filter(
      (item) => item.packingListId === packingListId
    );
  }
  
  async createPackingItem(packingItem: InsertPackingItem): Promise<PackingItem> {
    const id = this.currentPackingItemId++;
    const timestamp = new Date();
    const newPackingItem: PackingItem = { ...packingItem, id, createdAt: timestamp };
    this.packingItems.set(id, newPackingItem);
    return newPackingItem;
  }
  
  async updatePackingItem(id: number, packingItem: Partial<InsertPackingItem>): Promise<PackingItem | undefined> {
    const existingItem = this.packingItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem: PackingItem = { ...existingItem, ...packingItem };
    this.packingItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deletePackingItem(id: number): Promise<boolean> {
    return this.packingItems.delete(id);
  }
  
  // Automatic packing list generation using AI and user's outfits and garments
  async generatePackingListForTrip(tripId: number, userId: number): Promise<PackingList> {
    const trip = await this.getTrip(tripId);
    if (!trip) throw new Error("Viaje no encontrado");
    
    // Crear lista de equipaje recomendada
    const packingList = await this.createPackingList({
      tripId,
      name: `Lista para ${trip.destination}`,
      isRecommended: true
    });
    
    // Obtener preferencias y prendas del usuario
    const userPrefs = await this.getUserPreferences(userId);
    const userGarments = await this.getGarmentsByUserId(userId);
    
    // Categorías básicas de elementos para empacar
    const itemCategories = [
      "Ropa", "Calzado", "Accesorios", "Higiene", "Documentos", "Electrónicos", "Otros"
    ];
    
    // Elementos básicos según temporada y destino
    const basicItems: {name: string; category: string; isEssential: boolean}[] = [];
    
    // Añadir elementos básicos según la temporada
    if (trip.season === "Verano") {
      basicItems.push(
        {name: "Protector solar", category: "Higiene", isEssential: true},
        {name: "Gafas de sol", category: "Accesorios", isEssential: true},
        {name: "Traje de baño", category: "Ropa", isEssential: false}
      );
    } else if (trip.season === "Invierno") {
      basicItems.push(
        {name: "Bufanda", category: "Accesorios", isEssential: true},
        {name: "Guantes", category: "Accesorios", isEssential: true},
        {name: "Gorro", category: "Accesorios", isEssential: false}
      );
    }
    
    // Añadir elementos básicos para cualquier viaje
    basicItems.push(
      {name: "Pasaporte/DNI", category: "Documentos", isEssential: true},
      {name: "Cargador de móvil", category: "Electrónicos", isEssential: true},
      {name: "Medicamentos personales", category: "Higiene", isEssential: true},
      {name: "Cepillo de dientes", category: "Higiene", isEssential: true},
      {name: "Pasta de dientes", category: "Higiene", isEssential: true}
    );
    
    // Añadir prendas apropiadas del guardarropa del usuario
    // Filtrar las prendas según la temporada del viaje
    const seasonalGarments = userGarments.filter(garment => 
      !garment.season || garment.season === trip.season
    ).slice(0, 5); // Limitar a 5 prendas para el ejemplo
    
    // Crear items para la lista de empaque
    for (const item of basicItems) {
      await this.createPackingItem({
        packingListId: packingList.id,
        name: item.name,
        category: item.category,
        isEssential: item.isEssential,
        quantity: 1,
        isPacked: false
      });
    }
    
    // Añadir prendas del usuario a la lista
    for (const garment of seasonalGarments) {
      await this.createPackingItem({
        packingListId: packingList.id,
        name: garment.name,
        category: "Ropa",
        isEssential: true,
        quantity: 1,
        isPacked: false,
        imageUrl: garment.imageUrl || null,
        garmentId: garment.id
      });
    }
    
    return packingList;
  }
}

export const storage = new MemStorage();
