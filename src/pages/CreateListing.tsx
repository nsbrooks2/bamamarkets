import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, UA_UNIVERSITY_ID } from '../types';
import { Camera, Upload, AlertCircle, CheckCircle2, X, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export const CreateListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: CATEGORIES[0],
    description: ''
  });

  useEffect(() => {
    // Try to get user location on mount
    handleGetLocation();
  }, []);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setGettingLocation(false);
        }
      );
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
    
    setLoading(true);
    setError(null);

    try {
      const imageUrls: string[] = [];

      for (const img of images) {
        const formDataUpload = new FormData();
        formDataUpload.append('image', img);
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
        imageUrls.push(url);
      }

      const response = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          price: formData.price,
          category: formData.category,
          description: formData.description,
          imageUrl: imageUrls[0] || '', // Main image
          images: imageUrls, // All images
          lat: location?.lat,
          lng: location?.lng,
          userId: user.id
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create listing');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-crimson-100 p-3 rounded-2xl">
            <Upload className="w-6 h-6 text-crimson-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Create a Listing</h2>
            <p className="text-stone-500">List your item for other students to see.</p>
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
            <label className="text-sm font-semibold text-stone-700 ml-1">Item Images (Up to 5)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          {/* Location Status */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${location ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-500'}`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">
                  {location ? 'Location Tagged' : 'Location Optional'}
                </p>
                <p className="text-xs text-stone-500">
                  {location ? 'Your current location will be shown on the map.' : 'Enable location for better discovery.'}
                </p>
              </div>
            </div>
            {!location && (
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gettingLocation}
                className="text-xs font-bold text-crimson-600 hover:text-crimson-700 transition-colors"
              >
                {gettingLocation ? 'Getting...' : 'Retry'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700 ml-1">Title</label>
              <input 
                type="text"
                required
                placeholder="e.g. Calculus Textbook"
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
                placeholder="0.00"
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
              placeholder="Describe the item's condition, features, etc."
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
            {loading ? 'Creating Listing...' : 'Post Listing'}
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
