import { 
  users, User, InsertUser,
  garments, Garment, InsertGarment,
  outfits, Outfit, InsertOutfit,
  userPreferences, UserPreferences, InsertUserPreferences,
  annaDesigns, AnnaDesign, InsertAnnaDesign,
  products, Product, InsertProduct,
  // Backward compatibility
  seleneDesigns, SeleneDesign, InsertSeleneDesign,
  trips, Trip, InsertTrip,
  packingLists, PackingList, InsertPackingList,
  packingItems, PackingItem, InsertPackingItem
} from "@shared/schema";

export interface ProductSearchFilters {
  query?: string;
  category?: string;
  minPrice?: number; // in cents
  maxPrice?: number; // in cents
  tags?: string[];
  activeOnly?: boolean;
}

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
  
  // Anna designs methods
  getAnnaDesign(id: number): Promise<AnnaDesign | undefined>;
  getAllAnnaDesigns(): Promise<AnnaDesign[]>;
  getAnnaDesignsByCategory(category: string): Promise<AnnaDesign[]>;
  createAnnaDesign(design: InsertAnnaDesign): Promise<AnnaDesign>;
  
  // Backward compatibility - Selene designs methods (alias for Anna)
  getSeleneDesign(id: number): Promise<SeleneDesign | undefined>;
  getAllSeleneDesigns(): Promise<SeleneDesign[]>;
  getSeleneDesignsByCategory(category: string): Promise<SeleneDesign[]>;
  createSeleneDesign(design: InsertSeleneDesign): Promise<SeleneDesign>;

  // Product (Smart Inventory) methods
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  searchProducts(filters: ProductSearchFilters): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  
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
  private annaDesigns: Map<number, AnnaDesign>;
  private products: Map<number, Product>;
  private trips: Map<number, Trip>;
  private packingLists: Map<number, PackingList>;
  private packingItems: Map<number, PackingItem>;

  private currentUserId: number;
  private currentGarmentId: number;
  private currentOutfitId: number;
  private currentPreferencesId: number;
  private currentDesignId: number;
  private currentProductId: number;
  private currentTripId: number;
  private currentPackingListId: number;
  private currentPackingItemId: number;

  constructor() {
    this.users = new Map();
    this.garments = new Map();
    this.outfits = new Map();
    this.userPreferences = new Map();
    this.annaDesigns = new Map();
    this.products = new Map();
    this.trips = new Map();
    this.packingLists = new Map();
    this.packingItems = new Map();

    this.currentUserId = 1;
    this.currentGarmentId = 1;
    this.currentOutfitId = 1;
    this.currentPreferencesId = 1;
    this.currentDesignId = 1;
    this.currentProductId = 1;
    this.currentTripId = 1;
    this.currentPackingListId = 1;
    this.currentPackingItemId = 1;

    // Initialize with some demo Anna designs
    this.initializeAnnaDesigns();
    // Initialize with real inventory products
    this.initializeProducts();
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
  
  // Anna designs methods
  async getAnnaDesign(id: number): Promise<AnnaDesign | undefined> {
    return this.annaDesigns.get(id);
  }
  
  async getAllAnnaDesigns(): Promise<AnnaDesign[]> {
    return Array.from(this.annaDesigns.values());
  }
  
  async getAnnaDesignsByCategory(category: string): Promise<AnnaDesign[]> {
    return Array.from(this.annaDesigns.values()).filter(
      (design) => design.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  async createAnnaDesign(design: InsertAnnaDesign): Promise<AnnaDesign> {
    const id = this.currentDesignId++;
    const timestamp = new Date();
    const newDesign: AnnaDesign = { ...design, id, createdAt: timestamp };
    this.annaDesigns.set(id, newDesign);
    return newDesign;
  }
  
  // Backward compatibility - Selene designs methods (alias for Anna)
  async getSeleneDesign(id: number): Promise<SeleneDesign | undefined> {
    return this.getAnnaDesign(id);
  }
  
  async getAllSeleneDesigns(): Promise<SeleneDesign[]> {
    return this.getAllAnnaDesigns();
  }
  
  async getSeleneDesignsByCategory(category: string): Promise<SeleneDesign[]> {
    return this.getAnnaDesignsByCategory(category);
  }
  
  async createSeleneDesign(design: InsertSeleneDesign): Promise<SeleneDesign> {
    return this.createAnnaDesign(design);
  }

  // Product (Smart Inventory) methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category.toLowerCase() === category.toLowerCase()
    );
  }

  async searchProducts(filters: ProductSearchFilters): Promise<Product[]> {
    let results = Array.from(this.products.values());

    if (filters.activeOnly !== false) {
      results = results.filter((product) => product.isActive !== false);
    }

    if (filters.category && filters.category !== "all") {
      results = results.filter(
        (product) => product.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    if (typeof filters.minPrice === "number") {
      results = results.filter((product) => product.price >= filters.minPrice!);
    }

    if (typeof filters.maxPrice === "number") {
      results = results.filter((product) => product.price <= filters.maxPrice!);
    }

    if (filters.tags && filters.tags.length > 0) {
      const wanted = filters.tags.map((t) => t.toLowerCase());
      results = results.filter((product) =>
        (product.tags || []).some((tag) => wanted.includes(tag.toLowerCase()))
      );
    }

    if (filters.query) {
      const terms = filters.query
        .toLowerCase()
        .split(" ")
        .filter((term) => term.length > 0);

      const score = (product: Product): number => {
        const haystack = [
          product.name,
          product.description || "",
          product.category,
          ...(product.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        return terms.filter((term) => haystack.includes(term)).length;
      };

      results = results
        .map((product) => ({ product, relevance: score(product) }))
        .filter((entry) => entry.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .map((entry) => entry.product);
    }

    return results;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const timestamp = new Date();
    const newProduct: Product = {
      ...product,
      id,
      createdAt: timestamp,
      description: product.description ?? null,
      tags: product.tags ?? [],
      stock: product.stock ?? 0,
      imageUrl: product.imageUrl ?? null,
      isActive: product.isActive ?? true,
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  // Initialize with real inventory products (mirrors server/seedProducts.ts)
  private initializeProducts() {
    const inventory: InsertProduct[] = [
      {
        name: "Jogger Wide Leg Beige",
        description:
          "Jogger estilo wide leg en tela tipo velvet con cintura ajustable. Súper cómodo para looks casuales y relajados. Ideal para otoño e invierno.",
        category: "bottom",
        tags: ["comfy", "velvet", "beige", "casual", "wide-leg", "invierno", "otoño"],
        price: 39900,
        stock: 15,
        imageUrl: "/products/jogger-wide-leg-beige.jpg",
        isActive: true,
      },
      {
        name: "Pantalón Deportivo Gris Acero",
        description:
          "Pantalón deportivo con cierres decorativos en gris acero. Perfecto para un look urbano y moderno con toques streetwear.",
        category: "bottom",
        tags: ["sport", "cierres", "gris", "urbano", "streetwear", "moderno"],
        price: 34900,
        stock: 20,
        imageUrl: "/products/pantalon-deportivo-gris.jpg",
        isActive: true,
      },
      {
        name: "Suéter Tejido Rayas B&W",
        description:
          "Suéter tejido calado con rayas blancas y negras y detalle pointelle. Un básico atemporal que combina con todo. Perfecto para looks casuales y de oficina.",
        category: "top",
        tags: ["tejido", "rayas", "blanco", "negro", "clásico", "atemporal", "oficina"],
        price: 45900,
        stock: 12,
        imageUrl: "/products/sueter-rayas-bw.jpg",
        isActive: true,
      },
      {
        name: "Suéter Punto Rosa Pastel",
        description:
          "Suéter de punto texturizado en rosa pastel con manga corta y patrón a cuadros. Suave al tacto, ideal para looks femeninos y románticos. Disponible en varios tonos.",
        category: "top",
        tags: ["texturizado", "suave", "rosa", "manga-corta", "femenino", "romántico", "primavera"],
        price: 37900,
        stock: 10,
        imageUrl: "/products/sueter-punto-rosa.jpg",
        isActive: true,
      },
      {
        name: "Cardigan Botones Vintage ML-359",
        description:
          "Cardigan con botones estilo vintage y tejido trenzado con bolsillos. Perfecto como abrigo ligero. Dale un toque retro a tu outfit. Disponible en 7 colores.",
        category: "top",
        tags: ["botones", "rosa-viejo", "tejido-grueso", "abrigo", "vintage", "retro", "invierno"],
        price: 54900,
        stock: 8,
        imageUrl: "/products/cardigan-vintage.jpg",
        isActive: true,
      },
      {
        name: "Leggings Térmicos Afelpados",
        description:
          "Leggings térmicos con efecto translúcido tipo piel y forro afelpado. Ideales para invierno, mantienen el calor con un look elegante y discreto.",
        category: "bottom",
        tags: ["invierno", "térmico", "negro", "piel", "elegante", "caliente", "leggins"],
        price: 29900,
        stock: 25,
        imageUrl: "/products/leggings-termicos.jpg",
        isActive: true,
      },
      {
        name: "Top Rayas Manga Corta Blanco",
        description:
          "Top de punto fino calado en blanco con rayas negras y manga abullonada corta. Ligero y fresco, ideal para primavera y looks casuales chic.",
        category: "top",
        tags: ["punto", "rayas", "blanco", "negro", "manga-corta", "primavera", "casual"],
        price: 34900,
        stock: 18,
        imageUrl: "/products/top-rayas-manga-corta.jpg",
        isActive: true,
      },
      {
        name: "Pantalón Wide Leg Café",
        description:
          "Pantalón wide leg en tela suave color café con cintura elástica y cordón. Caída fluida y elegante para looks cómodos y sofisticados.",
        category: "bottom",
        tags: ["wide-leg", "café", "marrón", "cordón", "comfy", "otoño", "elegante"],
        price: 41900,
        stock: 14,
        imageUrl: "/products/pantalon-wide-leg-cafe.jpg",
        isActive: true,
      },
      {
        name: "Pantalón Deportivo Rosa Palo",
        description:
          "Pantalón deportivo en rosa palo con cierres decorativos y bolsillos. Estilo athleisure femenino, cómodo para el día a día.",
        category: "bottom",
        tags: ["sport", "cierres", "rosa", "athleisure", "femenino", "cómodo", "urbano"],
        price: 34900,
        stock: 16,
        imageUrl: "/products/pantalon-deportivo-rosa.jpg",
        isActive: true,
      },
      {
        name: "Pantalón Rayado Studio Moda",
        description:
          "Pantalón recto en tejido rayado fino color taupe con cintura con cordón. Look relajado y natural, perfecto para combinar con básicos.",
        category: "bottom",
        tags: ["rayado", "taupe", "cordón", "recto", "casual", "natural", "otoño"],
        price: 38900,
        stock: 11,
        imageUrl: "/products/pantalon-rayado-studio.jpg",
        isActive: true,
      },
      {
        name: "Pantalón Wide Leg Verde Sage",
        description:
          "Pantalón wide leg en verde sage con cintura elástica y cordón. Tono tendencia que aporta frescura a cualquier outfit casual.",
        category: "bottom",
        tags: ["wide-leg", "verde", "sage", "cordón", "tendencia", "casual", "primavera"],
        price: 39900,
        stock: 13,
        imageUrl: "/products/pantalon-wide-leg-sage.jpg",
        isActive: true,
      },
      {
        name: "Suéter Punto Rosa Diamante",
        description:
          "Suéter de punto en rosa pastel con textura de rombos y manga larga. Suave, abrigador y femenino. Ideal para otoño e invierno.",
        category: "top",
        tags: ["punto", "rosa", "rombos", "manga-larga", "femenino", "abrigador", "invierno"],
        price: 39900,
        stock: 9,
        imageUrl: "/products/sueter-rosa-diamante.jpg",
        isActive: true,
      },
    ];

    inventory.forEach((product) => {
      const id = this.currentProductId++;
      const timestamp = new Date();
      this.products.set(id, {
        ...product,
        id,
        createdAt: timestamp,
        description: product.description ?? null,
        tags: product.tags ?? [],
        stock: product.stock ?? 0,
        imageUrl: product.imageUrl ?? null,
        isActive: product.isActive ?? true,
      });
    });
  }

  // Initialize with some demo Anna designs
  private initializeAnnaDesigns() {
    const designs: InsertAnnaDesign[] = [
      {
        name: "Anna's Signature Dress",
        description: "Elegant black evening dress with gold details",
        category: "Dresses",
        imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Pearl Stilettos",
        description: "Handcrafted stiletto heels with pearl embellishments",
        category: "Footwear",
        imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Embroidered Silk Blouse",
        description: "Silk blouse with intricate hand embroidery",
        category: "Blouses",
        imageUrl: "https://images.unsplash.com/photo-1551232864-3f0890e580d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Gold Pearl Statement",
        description: "Luxury pearl necklace with gold accents",
        category: "Accessories",
        imageUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Evening Luxury Clutch",
        description: "Handcrafted clutch with metallic details",
        category: "Accessories",
        imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Tailored Blazer",
        description: "Professional blazer with modern cut",
        category: "Blazers",
        imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      },
      {
        name: "Designer Skirt",
        description: "A-line skirt with unique pattern",
        category: "Skirts",
        imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
      },
      {
        name: "Luxury Handbag",
        description: "Premium leather handbag with gold hardware",
        category: "Accessories",
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80"
      }
    ];
    
    designs.forEach(design => {
      const id = this.currentDesignId++;
      const timestamp = new Date();
      this.annaDesigns.set(id, { ...design, id, createdAt: timestamp });
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
