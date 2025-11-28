export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  shop_the_look?: {
    item_name: string;
    affiliate_url: string;
    image_url: string;
  }[];
}

export interface UserProfile {
  id: string;
  email: string;
  modelPreferences?: string;
}
