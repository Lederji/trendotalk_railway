import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';

interface NativeAdProps {
  slot?: string;
  className?: string;
  style?: 'instagram-feed' | 'compact' | 'large';
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

export function NativeAd({ 
  slot = "ca-app-pub-5416860171942296/8661604900", 
  className = '', 
  style = 'instagram-feed' 
}: NativeAdProps) {
  React.useEffect(() => {
    try {
      (window.adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.log('AdSense native ad error:', err);
    }
  }, []);

  if (style === 'compact') {
    return (
      <Card className={`native-ad my-3 border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center text-sm text-gray-500 mb-2">Advertisement</div>
          <ins
            className="adsbygoogle"
            style={{ display: 'block', height: '100px' }}
            data-ad-client="ca-app-pub-5416860171942296"
            data-ad-slot={slot}
            data-ad-format="fluid"
            data-layout-key="-6t+ed+2i-1n-4w"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`native-ad my-4 border border-gray-200 bg-white ${className}`}>
      <CardContent className="p-4">
        <div className="text-center text-sm text-gray-500 mb-3">Advertisement</div>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '200px' }}
          data-ad-client="ca-app-pub-5416860171942296"
          data-ad-slot={slot}
          data-ad-format="fluid"
          data-layout-key="-fb+5w+4e-db+86"
        />
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