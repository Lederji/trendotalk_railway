#!/bin/bash

# TrendoTalk Mobile App Build Script
echo "🚀 Building TrendoTalk Mobile App..."

# Step 1: Build the web app for mobile
echo "📦 Building web app..."
npm run build

# Step 2: Copy web assets to Capacitor
echo "📋 Copying assets to Capacitor..."
npx cap copy

# Step 3: Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync

# Step 4: Update server URL for production
echo "⚙️  Configuring for production..."
# You'll need to update this with your actual Replit app URL
REPLIT_URL="https://your-app-name.your-username.repl.co"
echo "Using server URL: $REPLIT_URL"

# Step 5: Open Android Studio (optional)
if [ "$1" = "--open" ]; then
    echo "📱 Opening Android Studio..."
    npx cap open android
else
    echo "✅ Build complete! Run with --open to launch Android Studio"
    echo ""
    echo "Next steps:"
    echo "1. Run 'bash build-mobile.sh --open' to open Android Studio"
    echo "2. Build APK: Build > Build Bundle(s) / APK(s) > Build APK(s)"
    echo "3. Build AAB for Play Store: Build > Generate Signed Bundle / APK"
fi

echo "🎉 Mobile app build completed!"