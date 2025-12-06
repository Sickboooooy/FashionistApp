import { pgTable, text, serial, integer, boolean, json, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  styles: json("styles").$type<string[]>().default([]),
  occasions: json("occasions").$type<{ 
    name: string; 
    priority: number; 
  }[]>().default([]),
  seasons: json("seasons").$type<string[]>().default([]),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true
});

export const garments = pgTable("garments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  color: text("color"),
  material: text("material"),
  pattern: text("pattern"),
  season: text("season"),
  style: text("style"),
  occasions: json("occasions").$type<string[]>().default([]),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGarmentSchema = createInsertSchema(garments).omit({
  id: true,
  createdAt: true,
});

export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  occasion: text("occasion"),
  season: text("season"),
  garmentIds: json("garment_ids").$type<number[]>().default([]),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  isSaved: boolean("is_saved").default(false),
});

export const insertOutfitSchema = createInsertSchema(outfits).omit({
  id: true,
  createdAt: true,
});

export const annaDesigns = pgTable("anna_designs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnnaDesignSchema = createInsertSchema(annaDesigns).omit({
  id: true,
  createdAt: true,
});

// 🛒 SMART INVENTORY SYSTEM - Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'top', 'bottom', 'shoes', 'accessory'
  tags: json("tags").$type<string[]>().default([]),
  price: integer("price").notNull(), // Price in MXN cents (29900 = $299.00)
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

// Type Definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type Garment = typeof garments.$inferSelect;
export type InsertGarment = z.infer<typeof insertGarmentSchema>;

export type Outfit = typeof outfits.$inferSelect;
export type InsertOutfit = z.infer<typeof insertOutfitSchema>;

export type AnnaDesign = typeof annaDesigns.$inferSelect;
export type InsertAnnaDesign = z.infer<typeof insertAnnaDesignSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Backward compatibility aliases
export const seleneDesigns = annaDesigns;
export const insertSeleneDesignSchema = insertAnnaDesignSchema;
export type SeleneDesign = AnnaDesign;
export type InsertSeleneDesign = InsertAnnaDesign;

// Tablas para planificación de viajes
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  season: text("season"),
  activities: text("activities").array(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
});

export const packingLists = pgTable("packing_lists", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isRecommended: boolean("is_recommended").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPackingListSchema = createInsertSchema(packingLists).omit({
  id: true,
  createdAt: true,
});

export const packingItems = pgTable("packing_items", {
  id: serial("id").primaryKey(),
  packingListId: integer("packing_list_id").notNull().references(() => packingLists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").default(1),
  isPacked: boolean("is_packed").default(false),
  isEssential: boolean("is_essential").default(false),
  imageUrl: text("image_url"),
  notes: text("notes"),
  garmentId: integer("garment_id").references(() => garments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPackingItemSchema = createInsertSchema(packingItems).omit({
  id: true,
  createdAt: true,
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type PackingList = typeof packingLists.$inferSelect;
export type InsertPackingList = z.infer<typeof insertPackingListSchema>;

export type PackingItem = typeof packingItems.$inferSelect;
export type InsertPackingItem = z.infer<typeof insertPackingItemSchema>;
