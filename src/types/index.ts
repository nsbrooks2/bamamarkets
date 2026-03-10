export interface University {
  id: string;
  name: string;
  domain: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  university_id?: string;
  location?: string;
  created_at: string;
  university?: University;
  followers_count?: number;
  following_count?: number;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string; // Keep for backward compatibility (main image)
  images?: string[]; // Multiple images
  seller_id: string;
  university_id: string;
  boosted: boolean;
  boost_expires_at?: string;
  views: number;
  lat?: number;
  lng?: number;
  location_name?: string;
  created_at: string;
  seller?: User;
  university?: University;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

export interface Review {
  id: string;
  reviewer_id: string;
  seller_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'favorite' | 'offer' | 'system' | 'follow';
  content: string;
  read: boolean;
  link?: string;
  created_at: string;
}

export const UA_UNIVERSITY_ID = '00000000-0000-0000-0000-000000000001';

export interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  sale_price: number;
  platform_fee: number;
  created_at: string;
}

export type Category = 
  | 'Furniture' 
  | 'Electronics' 
  | 'Textbooks' 
  | 'Dorm Items' 
  | 'Clothes' 
  | 'Tickets' 
  | 'Other';

export const CATEGORIES: Category[] = [
  'Furniture',
  'Electronics',
  'Textbooks',
  'Dorm Items',
  'Clothes',
  'Tickets',
  'Other'
];
