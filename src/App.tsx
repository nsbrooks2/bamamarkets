/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ListingDetail } from './pages/ListingDetail';
import { CreateListing } from './pages/CreateListing';
import { MyListings } from './pages/MyListings';
import { Login } from './pages/Login';
import { Messages } from './pages/Messages';
import { Trending } from './pages/Trending';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { EditListing } from './pages/EditListing';
import { Favorites } from './pages/Favorites';
import { Notifications } from './pages/Notifications';
import { AuthProvider } from './components/AuthProvider';
import { useEffect } from 'react';
import { initializeStorage } from './lib/supabase';

export default function App() {
  useEffect(() => {
    initializeStorage();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
          <Navbar />
          <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route path="/create" element={<CreateListing />} />
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/trending" element={<Trending />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<PublicProfile />} />
              <Route path="/edit/:id" element={<EditListing />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/notifications" element={<Notifications />} />
            </Routes>
          </main>
        </div>
        <Analytics />
      </AuthProvider>
    </Router>
  );
}

