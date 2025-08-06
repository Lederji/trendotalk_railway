#!/bin/bash

# TrendoTalk Mobile Build - Play Store Ready
echo "🎬 TrendoTalk Mobile Build Started"

# Clean and build
echo "Building web app..."
NODE_ENV=production npm run build

echo "Syncing Capacitor..."
npx cap copy
npx cap sync

# Show completion
echo ""
echo "✅ Build Complete!"
echo ""
echo "🚀 Next Steps for Google Play Store:"
echo "1. npx cap open android"
echo "2. Build > Generate Signed Bundle/APK"
echo "3. Upload to Google Play Console"
echo ""
echo "💰 AdMob Revenue Ready:"
echo "- Banner ads on Home page"
echo "- Interstitial ads on Trends"
echo "- Native ads on Search"
echo ""
echo "🎯 Auto Video Management:"
echo "- Videos auto-trimmed to 60 seconds"
echo "- Videos auto-deleted after 72 hours"
echo ""

# Open Android Studio if requested
if [ "$1" = "--open" ]; then
    echo "📱 Opening Android Studio..."
    npx cap open android
fi