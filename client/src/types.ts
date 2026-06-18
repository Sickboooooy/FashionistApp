export interface OutfitItem {
  name: string;
  type: string;
  color: string;
  notes: string;
}

export interface OutfitSuggestion {
  title: string;
  description: string;
  occasion: string;
  style: string;
  items: OutfitItem[];
}

export interface AnalysisResult {
  garmentDescription: string;
  category: string;
  colorPalette: string[];
  suggestions: OutfitSuggestion[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface FashionArticle {
  id: string;
  headline: string;
  subhead: string;
  content: string;
  imageUrl: string;
  tag: string;
}