import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const initializeStorage = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === 'listing-images');
    
    if (!exists) {
      await supabase.storage.createBucket('listing-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      });
      console.log('Created listing-images bucket');
    }
  } catch (error) {
    // This might fail if the anon key doesn't have permission to list/create buckets
    // which is common. In that case, the bucket should be created manually in the dashboard.
    console.warn('Could not verify/create storage bucket automatically:', error);
  }
};
