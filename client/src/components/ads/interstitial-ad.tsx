import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Play, SkipForward } from 'lucide-react';

interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip?: () => void;
  showSkipAfter?: number; // seconds
  autoClose?: boolean;
  autoCloseAfter?: number; // seconds
}

export function InterstitialAd({ 
  isOpen, 
  onClose, 
  onSkip, 
  showSkipAfter = 5,
  autoClose = false,
  autoCloseAfter = 10
}: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(showSkipAfter);
  const [canSkip, setCanSkip] = useState(false);
  const [autoCloseCount, setAutoCloseCount] = useState(autoCloseAfter);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(showSkipAfter);
      setCanSkip(false);
      setAutoCloseCount(autoCloseAfter);
      return;
    }

    // Initialize AdSense ad when component opens
    try {
      (window.adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.log('AdSense interstitial ad error:', err);
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });

      if (autoClose) {
        setAutoCloseCount(prev => {
          if (prev <= 1) {
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, showSkipAfter, autoClose, autoCloseAfter, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Video Ad Placeholder */}
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        {/* Real AdMob Interstitial Ad */}
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client="ca-app-pub-5416860171942296"
            data-ad-slot="3220773633"
            data-ad-format="interstitial"
            data-full-width-responsive="true"
          />
        </div>

        {/* Skip button */}
        {canSkip && (
          <Button
            onClick={onSkip || onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border border-white/30"
            size="sm"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip Ad
          </Button>
        )}

        {/* Countdown */}
        {!canSkip && countdown > 0 && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            Skip in {countdown}s
          </div>
        )}

        {/* Auto close countdown */}
        {autoClose && canSkip && autoCloseCount > 0 && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            Auto close in {autoCloseCount}s
          </div>
        )}

        {/* Ad label */}
        <div className="absolute top-4 left-4 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
          AD
        </div>
      </div>
    </div>
  );
}

// Hook to manage interstitial ad display logic
export function useInterstitialAd(intervalCount: number = 5) {
  const [adCount, setAdCount] = useState(0);
  const [showAd, setShowAd] = useState(false);

  const triggerAd = () => {
    setAdCount(prev => {
      const newCount = prev + 1;
      if (newCount >= intervalCount) {
        setShowAd(true);
        return 0; // Reset counter
      }
      return newCount;
    });
  };

  const closeAd = () => {
    setShowAd(false);
  };

  return {
    showAd,
    triggerAd,
    closeAd
  };
}