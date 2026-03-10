import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Listing, CATEGORIES, Category, UA_UNIVERSITY_ID } from '../types';
import { ListingCard } from '../components/ListingCard';
import { ListingGrid } from '../components/ListingGrid';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { Search, Filter, X } from 'lucide-react';
import { motion } from 'motion/react';

export const Home: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [showNearMe, setShowNearMe] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, sortBy, showNearMe]);

  const handleNearMe = () => {
    if (!showNearMe) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setShowNearMe(true);
          },
          (error) => {
            console.error('Error getting location:', error);
            alert('Could not get your location. Please enable location services.');
          }
        );
      }
    } else {
      setShowNearMe(false);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('listings')
        .select('*')
        .eq('university_id', UA_UNIVERSITY_ID);

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      // Sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else if (sortBy === 'popular') {
        query = query.order('views', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let results = data || [];

      // Client-side filtering for price and location (since SQL distance is complex without PostGIS)
      results = results.filter(listing => listing.price >= priceRange[0] && listing.price <= priceRange[1]);

      if (showNearMe && userLocation) {
        // Simple distance filter (approximate)
        results = results.filter(listing => {
          if (!listing.lat || !listing.lng) return false;
          const dist = Math.sqrt(
            Math.pow(listing.lat - userLocation.lat, 2) + 
            Math.pow(listing.lng - userLocation.lng, 2)
          );
          return dist < 0.1; // Roughly 10km
        });
      }

      setListings(results);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => 
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 px-4 bg-crimson-600 rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight"
          >
            BamaMarkets
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-crimson-50 text-lg"
          >
            The exclusive marketplace for University of Alabama students.
          </motion.p>
          
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search for textbooks, furniture, and more..."
          />
        </div>
        
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson-500 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-crimson-700 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-50"></div>
      </section>

      {/* Filters & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <CategoryFilter selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={handleNearMe}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              showNearMe 
                ? 'bg-crimson-50 border-crimson-200 text-crimson-700' 
                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
            }`}
          >
            <Search className="w-4 h-4" />
            Near Me
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-stone-200 text-stone-600 text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-crimson-500/20 focus:border-crimson-500"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>

          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-full px-4 py-2">
            <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">Price</span>
            <input 
              type="number" 
              placeholder="Min"
              className="w-16 text-sm focus:outline-none"
              onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
            />
            <span className="text-stone-300">-</span>
            <input 
              type="number" 
              placeholder="Max"
              className="w-16 text-sm focus:outline-none"
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 10000])}
            />
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <ListingGrid 
        listings={filteredListings} 
        loading={loading} 
        emptyMessage="No listings found"
        emptySubmessage="Try adjusting your search or category filters."
      />
    </div>
  );
};
