import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-stone-200 pt-12 pb-24 md:pb-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-xl font-display font-black tracking-tight text-stone-900 leading-none">BamaMarkets</span>
              <span className="text-[10px] font-black text-crimson-600 uppercase tracking-[0.2em]">The Capstone</span>
            </div>
            <p className="text-stone-500 text-sm max-w-xs">
              The premier student-to-student marketplace for the University of Alabama community.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-crimson-600" />
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-stone-500">
              <li><Link to="/" className="hover:text-crimson-600 transition-colors">Marketplace</Link></li>
              <li><Link to="/trending" className="hover:text-crimson-600 transition-colors">Trending Items</Link></li>
              <li><Link to="/create" className="hover:text-crimson-600 transition-colors">Sell an Item</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-crimson-600" />
              Safety & Trust
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Always meet in public, well-lit areas on campus (like the Ferguson Center or Bryant-Denny) for transactions. Never share your password or personal banking info.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-100">
          <div className="bg-stone-50 rounded-2xl p-6 mb-8">
            <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Legal Disclaimer</h5>
            <p className="text-[11px] text-stone-400 leading-relaxed italic">
              BamaMarkets is an independent, student-run platform and is not affiliated with, sponsored by, or endorsed by the University of Alabama. "Bama" and "The Capstone" are used for descriptive purposes to identify the target community. All trademarks, logos, and brand names are the property of their respective owners. Users are responsible for ensuring their listings comply with all university policies and local laws.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-stone-400">
              © {new Date().getFullYear()} BamaMarkets. Built for students, by students.
            </p>
            <div className="flex gap-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              <span className="hover:text-stone-600 cursor-pointer">Terms of Service</span>
              <span className="hover:text-stone-600 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-stone-600 cursor-pointer">Safety Tips</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
