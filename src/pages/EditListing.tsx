import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, Listing } from '../types';
import { Camera, Save, AlertCircle, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

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
        const formDataUpload = new FormData();
        formDataUpload.append('image', image);
        formDataUpload.append('userId', user.id);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload
        });

        if (!uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        const { url } = await uploadResponse.json();
        imageUrl = url;
      }

      const response = await fetch('/api/listings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: formData.title,
          price: formData.price,
          category: formData.category,
          description: formData.description,
          imageUrl,
          userId: user.id
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update listing');
      }

      navigate('/my-listings');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            <select 
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 outline-none appearance-none"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

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
