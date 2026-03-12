import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, Listing, CLOTHING_SIZES, SHOE_SIZES } from '../types';
import { Camera, Save, AlertCircle, ChevronLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EditListing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: CATEGORIES[0],
    size: '',
    description: ''
  });

  useEffect(() => {
    if (id) fetchListing();
  }, [id]);

  const fetchListing = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data.seller_id !== user?.id) {
        navigate('/my-listings');
        return;
      }

      setFormData({
        title: data.title,
        price: data.price.toString(),
        category: data.category,
        size: data.size || '',
        description: data.description
      });
      setImagePreview(data.image_url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    setLoading(true);
    setError(null);

    try {
      let imageUrl = imagePreview;

      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Prepare update data
      const updateData: any = {
        title: formData.title,
        price: parseFloat(formData.price),
        category: formData.category,
        size: formData.size || null,
        description: formData.description,
        image_url: imageUrl || undefined,
      };

      let { error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', id);

      // Fallback if 'size' column doesn't exist in DB yet
      if (updateError && (updateError.message.includes('size') || updateError.code === 'PGRST204')) {
        console.warn('Database missing "size" column, falling back to description append');
        const fallbackData = { ...updateData };
        delete fallbackData.size;
        if (formData.size) {
          fallbackData.description = `${formData.description}\n\nSize: ${formData.size}`;
        }
        
        const { error: retryError } = await supabase
          .from('listings')
          .update(fallbackData)
          .eq('id', id);
        
        updateError = retryError;
      }

      if (updateError) throw updateError;

      navigate('/my-listings');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isClothingOrShoes = formData.category === 'Clothes' || formData.category === 'Shoes';

  if (fetching) return <div className="text-center py-20">Loading listing...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-6 transition-colors font-medium"
      >
        <ChevronLeft className="w-5 h-5" />
        Back
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-crimson-100 p-3 rounded-2xl">
            <Save className="w-6 h-6 text-crimson-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Edit Listing</h2>
            <p className="text-stone-500">Update your item's information.</p>
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
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 ml-1">Item Image</label>
            <div 
              className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden cursor-pointer ${
                imagePreview ? 'border-crimson-400' : 'border-stone-200 hover:border-stone-400 bg-stone-50'
              }`}
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center p-6">
                  <Camera className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm text-stone-500 font-medium">Click to upload image</p>
                </div>
              )}
              <input 
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700 ml-1">Title</label>
              <input 
                type="text"
                required
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700 ml-1">Price ($)</label>
              <input 
                type="number"
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700 ml-1">Category</label>
            <div className="relative">
              <select 
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none appearance-none"
                value={formData.category}
                onChange={(e) => {
                  const newCat = e.target.value as any;
                  setFormData({ 
                    ...formData, 
                    category: newCat,
                    size: '' // Reset size when category changes
                  });
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5 pointer-events-none" />
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

          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700 ml-1">Description</label>
            <textarea 
              required
              rows={4}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Updating...' : 'Save Changes'}
            <Save className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
