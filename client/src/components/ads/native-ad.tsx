import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';

interface NativeAdProps {
  className?: string;
  variant?: 'feed' | 'home' | 'compact';
}

// Mock native ad data - in production, this would come from your ad network
const mockNativeAds = [
  {
    id: 1,
    title: "Boost Your Social Media Presence",
    description: "Get more followers and engagement with our proven strategies. Join thousands of successful creators.",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop",
    sponsor: "SocialGrow Pro",
    cta: "Learn More",
    rating: 4.8,
    price: "Free Trial"
  },
  {
    id: 2,
    title: "Professional Photo Editor",
    description: "Create stunning visuals for your posts with AI-powered editing tools. Perfect for content creators.",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop",
    sponsor: "PhotoMaster AI",
    cta: "Download Now",
    rating: 4.9,
    price: "Free"
  },
  {
    id: 3,
    title: "Trending Fashion Deals",
    description: "Discover the latest fashion trends and exclusive deals. Free shipping on orders over $50.",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop",
    sponsor: "FashionHub",
    cta: "Shop Now",
    rating: 4.7,
    price: "Up to 70% Off"
  }
];

export function NativeAd({ className = '', variant = 'feed' }: NativeAdProps) {
  // Randomly select an ad
  const ad = mockNativeAds[Math.floor(Math.random() * mockNativeAds.length)];

  if (variant === 'compact') {
    return (
      <Card className={`native-ad my-3 border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <img 
              src={ad.image} 
              alt={ad.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                <span>Sponsored</span>
                <span className="mx-1">•</span>
                <span>{ad.sponsor}</span>
              </div>
              <h4 className="font-semibold text-sm text-gray-900 truncate">{ad.title}</h4>
              <p className="text-xs text-gray-600 line-clamp-2">{ad.description}</p>
            </div>
            <Button size="sm" className="shrink-0 text-xs px-3 py-1">
              {ad.cta}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`native-ad my-4 border border-gray-200 bg-white ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          <img 
            src={ad.image} 
            alt={ad.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
            AD
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Sponsored by {ad.sponsor}</span>
            <div className="flex items-center text-xs text-gray-500">
              <Star className="w-3 h-3 fill-current text-yellow-400 mr-1" />
              {ad.rating}
            </div>
          </div>
          
          <h3 className="font-semibold text-lg text-gray-900 mb-2">{ad.title}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ad.description}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-semibold text-sm">{ad.price}</span>
            <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <ExternalLink className="w-3 h-3 mr-1" />
              {ad.cta}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Instagram-style feed ad component
export function FeedAd({ className = '' }: { className?: string }) {
  const ad = mockNativeAds[Math.floor(Math.random() * mockNativeAds.length)];

  return (
    <div className={`feed-ad bg-white border border-gray-200 ${className}`}>
      {/* Ad header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">AD</span>
          </div>
          <div>
            <p className="font-semibold text-sm">{ad.sponsor}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          •••
        </Button>
      </div>

      {/* Ad image */}
      <div className="relative">
        <img 
          src={ad.image} 
          alt={ad.title}
          className="w-full h-80 object-cover"
        />
      </div>

      {/* Ad content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 p-0">
              ♡
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 p-0">
              💬
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 p-0">
              📤
            </Button>
          </div>
        </div>

        <p className="font-semibold text-sm mb-1">{ad.sponsor}</p>
        <p className="text-sm text-gray-800 mb-2">
          <span className="font-semibold">{ad.title}</span> {ad.description}
        </p>
        
        <Button 
          size="sm" 
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 mt-2"
        >
          {ad.cta}
        </Button>
      </div>
    </div>
  );
}