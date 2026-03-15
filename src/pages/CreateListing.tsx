import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, UA_UNIVERSITY_ID, CLOTHING_SIZES, SHOE_SIZES } from '../types';
import { Camera, Upload, AlertCircle, CheckCircle2, X, MapPin, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CreateListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: CATEGORIES[0],
    size: '',
    description: '',
    locationName: ''
  });

  const [showSizeOptions, setShowSizeOptions] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('location')
      .eq('id', user?.id)
      .single();
    
    if (data?.location) {
      setFormData(prev => ({ ...prev, locationName: data.location }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newFiles].slice(0, 5)); // Limit to 5 images
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file as Blob));
      setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validation for Free Stuff
    if (formData.category === 'Free Stuff' && parseFloat(formData.price) !== 0) {
      setError('Items in the "Free Stuff" category must have a price of $0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imageUrls: string[] = [];

      for (const img of images) {
        const fileExt = img.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, img);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      // Prepare listing data
      const listingData: any = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        size: formData.size || null,
        image_url: imageUrls[0] || '',
        images: imageUrls,
        location_name: formData.locationName,
        university_id: UA_UNIVERSITY_ID,
        seller_id: user.id
      };

      let { error: insertError } = await supabase
        .from('listings')
        .insert(listingData);

      // Fallback if 'size' column doesn't exist in DB yet
      if (insertError && (insertError.message.includes('size') || insertError.code === 'PGRST204')) {
        console.warn('Database missing "size" column, falling back to description append');
        const fallbackData = { ...listingData };
        delete fallbackData.size;
        if (formData.size) {
          fallbackData.description = `${formData.description}\n\nSize: ${formData.size}`;
        }
        
        const { error: retryError } = await supabase
          .from('listings')
          .insert(fallbackData);
        
        insertError = retryError;
      }

      if (insertError) throw insertError;

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isClothingOrShoes = formData.category === 'Clothes' || formData.category === 'Shoes';

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Please log in to create a listing.</h2>
        <button 
          onClick={() => navigate('/login')}
          className="mt-4 px-6 py-2 bg-crimson-600 text-white rounded-lg"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-crimson-50 p-4 rounded-2xl">
            <Upload className="w-6 h-6 text-crimson-600" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-stone-900 tracking-tight">Create a Listing</h2>
            <p className="text-stone-500 text-sm">List your item for other students to see.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest">Item Images</label>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{imagePreviews.length}/5 Photos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 group">
                  <img src={preview} className="w-full h-full object-cover" alt={`Preview ${index}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-full text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {imagePreviews.length < 5 && (
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 hover:border-stone-400 bg-stone-50 flex flex-col items-center justify-center transition-all"
                >
                  <Camera className="w-8 h-8 text-stone-400 mb-1" />
                  <span className="text-xs text-stone-500 font-medium">Add Photo</span>
                </button>
              )}
            </div>
            <input 
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest ml-1">Title</label>
              <input 
                type="text"
                required
                placeholder="e.g. Calculus Textbook"
                className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none transition-all hover:border-stone-300"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest ml-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text"
                  required
                  placeholder="e.g. Tutwiler Hall"
                  className="w-full pl-12 pr-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none transition-all hover:border-stone-300"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest ml-1">Price ($)</label>
              <input 
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none disabled:opacity-50 transition-all hover:border-stone-300"
                value={formData.price}
                disabled={formData.category === 'Free Stuff'}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
              {formData.category === 'Free Stuff' && (
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider ml-1">Price locked to $0 for Free Stuff</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 uppercase tracking-widest ml-1">Category</label>
              <div className="relative">
                <select 
                  className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none appearance-none transition-all hover:border-stone-300"
                  value={formData.category}
                  onChange={(e) => {
                    const newCat = e.target.value as any;
                    setFormData({ 
                      ...formData, 
                      category: newCat,
                      price: newCat === 'Free Stuff' ? '0' : formData.price,
                      size: '' // Reset size when category changes
                    });
                  }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isClothingOrShoes && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 ml-1">Select Size</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Women's Sizes */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Women's</p>
                      <div className="flex flex-wrap gap-2">
                        {(formData.category === 'Clothes' ? CLOTHING_SIZES.womens : SHOE_SIZES.womens).map(s => (
                          <button
                            key={`w-${s}`}
                            type="button"
                            onClick={() => setFormData({ ...formData, size: `Women's ${s}` })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              formData.size === `Women's ${s}`
                                ? 'bg-crimson-600 text-white border-crimson-600 shadow-md'
                                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Men's Sizes */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Men's</p>
                      <div className="flex flex-wrap gap-2">
                        {(formData.category === 'Clothes' ? CLOTHING_SIZES.mens : SHOE_SIZES.mens).map(s => (
                          <button
                            key={`m-${s}`}
                            type="button"
                            onClick={() => setFormData({ ...formData, size: `Men's ${s}` })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              formData.size === `Men's ${s}`
                                ? 'bg-crimson-600 text-white border-crimson-600 shadow-md'
                                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {formData.size && (
                    <p className="text-xs text-crimson-600 font-bold mt-2 ml-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Selected: {formData.size}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              required
              rows={5}
              placeholder="Describe the item's condition, features, etc."
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-crimson-400 outline-none resize-none transition-all hover:border-stone-300"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-crimson-600 text-white rounded-2xl font-bold hover:bg-crimson-700 transition-all shadow-xl shadow-crimson-200 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
          >
            {loading ? 'Creating Listing...' : 'Post Listing'}
            <CheckCircle2 className="w-6 h-6" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
