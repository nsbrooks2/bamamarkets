import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Listing, CATEGORIES, Category, UA_UNIVERSITY_ID } from '../types';
import { ListingCard } from '../components/ListingCard';
import { ListingGrid } from '../components/ListingGrid';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { FilterDropdown } from '../components/FilterDropdown';
import { Search, Filter, X, Star, TrendingUp, Trophy, Sparkles, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';

export const Home: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedSize, setSelectedSize] = useState('');
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [gamedayListings, setGamedayListings] = useState<Listing[]>([]);

  useEffect(() => {
    fetchFeaturedListings();
    fetchGamedayListings();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, sortBy, priceRange, selectedSize]);

  const fetchFeaturedListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)');
      
      if (error) throw error;

      const results = (data || [])
        .filter((l: any) => l.featured && (!l.sold) && (new Date(l.featured_expires_at) > new Date()))
        .map((listing: any) => ({
          ...listing,
          favorite_count: 0
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

      setFeaturedListings(results);
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    }
  };

  const fetchGamedayListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)');
      
      if (error) throw error;

      const results = (data || [])
        .filter((l: any) => l.category === 'Gameday' && !l.sold)
        .map((listing: any) => ({
          ...listing,
          favorite_count: 0
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

      setGamedayListings(results);
    } catch (error) {
      console.error('Error fetching gameday listings:', error);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(*)');

      if (error) throw error;
      
      let results = (data || []).map((listing: any) => ({
        ...listing,
        favorite_count: 0
      }));

      // Filter out sold items (only if explicitly true)
      results = results.filter(l => l.sold !== true);

      if (selectedCategory !== 'All') {
        results = results.filter(l => l.category === selectedCategory);
      }

      // Size filtering
      if (selectedSize) {
        results = results.filter(l => l.size === selectedSize);
      }

      // Price filtering
      results = results.filter(listing => {
        const p = listing.price || 0;
        return p >= priceRange[0] && p <= priceRange[1];
      });

      // Sorting
      results.sort((a, b) => {
        // Priority 1: Featured
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        // Priority 2: Boosted
        if (a.boosted && !b.boosted) return -1;
        if (!a.boosted && b.boosted) return 1;

        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortBy === 'price_asc') {
          return a.price - b.price;
        } else if (sortBy === 'price_desc') {
          return b.price - a.price;
        } else if (sortBy === 'popular') {
          return (b.views || 0) - (a.views || 0);
        }
        return 0;
      });

      setListings(results);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const title = listing.title || '';
    const description = listing.description || '';
    const search = searchQuery.toLowerCase();
    return title.toLowerCase().includes(search) || description.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-6 bg-crimson-600 rounded-[2rem] md:rounded-[3rem] text-white overflow-hidden shadow-2xl shadow-crimson-200">
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 md:space-y-10">
          <div className="space-y-4 md:space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              Exclusive to UA Students
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.85]"
            >
              BamaMarkets
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-crimson-50 text-lg md:text-2xl font-medium max-w-2xl mx-auto opacity-90 leading-relaxed px-4"
            >
              The safest way to buy and sell on campus. 
              Built exclusively for the Capstone.
            </motion.p>
          </div>
          
          <div className="max-w-2xl mx-auto px-2 md:px-0">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search textbooks, furniture..."
            />
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">
            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Verified Students</span>
            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Zero Fees</span>
            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Campus Pickup</span>
          </div>
        </div>
        
        {/* Background Accents - More dynamic */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-400 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-crimson-800 rounded-full translate-y-1/2 -translate-x-1/2 blur-[100px] opacity-60"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
      </section>

      {/* Featured Section */}
      {featuredListings.length > 0 && selectedCategory === 'All' && !searchQuery && (
        <section className="space-y-6">
          <div className="flex items-end justify-between px-2">
            <div>
              <h2 className="text-2xl font-display font-bold text-stone-900 flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                Featured Picks
              </h2>
              <p className="text-sm text-stone-500 font-medium">Hand-picked premium listings from campus sellers.</p>
            </div>
            <span className="hidden sm:block text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">Premium Placement</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Gameday Section */}
      {gamedayListings.length > 0 && selectedCategory === 'All' && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-crimson-600" />
              Gameday Gear
            </h2>
            <Link to="/?category=Gameday" className="text-xs font-bold text-crimson-600 uppercase tracking-widest hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gamedayListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Quick Access */}
      {selectedCategory === 'All' && !searchQuery && (
        <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Trending on Campus</h2>
                <p className="text-sm text-stone-500">See what's popular right now.</p>
              </div>
            </div>
            <Link 
              to="/trending"
              className="px-6 py-2 bg-stone-900 text-white text-sm font-bold rounded-xl hover:bg-stone-800 transition-colors text-center"
            >
              View Trending
            </Link>
          </div>
        </section>
      )}

      {/* Filters & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <CategoryFilter selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        
        <FilterDropdown 
          sortBy={sortBy}
          onSortChange={setSortBy}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
          category={selectedCategory}
        />
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
