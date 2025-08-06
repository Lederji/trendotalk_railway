import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface BannerAdProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function BannerAd({ slot, format = 'auto', responsive = true, className = '' }: BannerAdProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.log('AdSense error:', err);
    }
  }, []);

  return (
    <Card className={`ad-container my-4 p-4 bg-gray-50 border-dashed border-gray-300 ${className}`}>
      <div className="text-center text-sm text-gray-500 mb-2">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: format === 'rectangle' ? '280px' : '90px'
        }}
        data-ad-client="ca-app-pub-5416860171942296"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </Card>
  );
}

// Fallback ad component for when AdSense is not available
export function FallbackAd({ className = '' }: { className?: string }) {
  return (
    <Card className={`ad-placeholder my-4 p-6 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 ${className}`}>
      <div className="text-center">
        <div className="text-sm font-medium text-pink-600 mb-2">
          📢 TrendoTalk Premium
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Upgrade to Premium for an ad-free experience
        </p>
        <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs rounded-full hover:from-pink-600 hover:to-purple-700 transition-colors">
          Learn More
        </button>
      </div>
    </Card>
  );
}