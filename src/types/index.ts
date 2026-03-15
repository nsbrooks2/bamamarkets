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
  // P2P Payment Fields
  venmo_username?: string;
  paypal_username?: string;
  zelle_email?: string;
  cashapp_username?: string;
  applepay_contact?: string;
  accepts_cash?: boolean;
  verified_student?: boolean;
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
  size?: string;
  image_url: string; // Keep for backward compatibility (main image)
  images?: string[]; // Multiple images
  seller_id: string;
  university_id: string;
  boosted: boolean;
  boost_expires_at?: string;
  featured: boolean;
  featured_expires_at?: string;
  views: number;
  view_count: number;
  favorite_count?: number;
  sold: boolean;
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
  listing_id?: string;
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
  | 'Gameday'
  | 'Furniture' 
  | 'Electronics' 
  | 'Textbooks' 
  | 'Dorm Items' 
  | 'Clothes' 
  | 'Shoes'
  | 'Tickets' 
  | 'Free Stuff'
  | 'Services'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Gameday',
  'Furniture',
  'Electronics',
  'Textbooks',
  'Dorm Items',
  'Clothes',
  'Shoes',
  'Tickets',
  'Free Stuff',
  'Services',
  'Other'
];

export const CLOTHING_SIZES = {
  womens: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  mens: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
};

export const SHOE_SIZES = {
  womens: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
  mens: ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15']
};
