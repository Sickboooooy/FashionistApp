import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
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
  pattern: text("pattern"),
  season: text("season"),
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

export const seleneDesigns = pgTable("selene_designs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSeleneDesignSchema = createInsertSchema(seleneDesigns).omit({
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

export type SeleneDesign = typeof seleneDesigns.$inferSelect;
export type InsertSeleneDesign = z.infer<typeof insertSeleneDesignSchema>;
