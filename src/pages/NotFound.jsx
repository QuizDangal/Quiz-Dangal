import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

/**
 * 404 Not Found Page
 * SEO-friendly: Shows proper 404 message instead of redirecting to home
 * This helps search engines understand the page doesn't exist
 */
const NotFound = () => {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | Quiz Dangal</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="The page you're looking for doesn't exist. Return to Quiz Dangal homepage." />
      </Helmet>
      
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          {/* 404 Visual */}
          <div className="relative mb-8">
            <div className="text-[120px] sm:text-[160px] font-bold leading-none bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent opacity-20 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 rounded-full bg-indigo-500/20 backdrop-blur-sm">
                <Search className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Page Not Found
          </h1>
          <p className="text-white/70 mb-8 leading-relaxed">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
            <br />
            <span className="text-white/50 text-sm">
              Ye page exist nahi karta ya hata diya gaya hai.
            </span>
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25"
            >
              <Home className="w-5 h-5" />
              Go to Homepage
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all duration-200 border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-white/50 text-sm mb-4">Popular pages you might be looking for:</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <Link to="/leaderboards/" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Leaderboards
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/about-us/" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                About Us
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/contact-us/" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
