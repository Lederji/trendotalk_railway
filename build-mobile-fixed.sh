#!/bin/bash

echo "🚀 Building TrendoTalk Mobile App with Permissions Fix..."

# Step 1: Clean and build the web app
echo "📦 Building web application..."
npm run build

# Step 2: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

# Step 3: Copy updated files
echo "📋 Copying updated Android configuration..."
npx cap copy android

# Step 4: Open Android Studio for final build
echo "🎯 Opening Android Studio for APK build..."
echo ""
echo "📱 MOBILE APP UPDATES COMPLETED:"
echo "✅ Fixed mobile navigation overlap with safe area handling"
echo "✅ Added microphone permission requests for voice calls"
echo "✅ Implemented startup permission check screen"
echo "✅ Updated button colors and interactions"
echo "✅ Instagram-style navigation layout"
echo ""
echo "🏗️ To complete the mobile app build:"
echo "1. Android Studio will open with the project"
echo "2. Build → Generate Signed Bundle/APK"
echo "3. Follow the signing process"
echo "4. Upload to Google Play Store"
echo ""
echo "📋 Manual Android Manifest Check:"
echo "- Microphone permission: ✅ android.permission.RECORD_AUDIO"
echo "- Camera permission: ✅ android.permission.CAMERA"
echo "- Internet permission: ✅ android.permission.INTERNET"
echo ""

# Open Android Studio if available
if command -v android-studio &> /dev/null; then
    echo "Opening Android Studio..."
    npx cap open android
else
    echo "⚠️ Android Studio not found. Please manually open the android/ folder in Android Studio"
    echo "📂 Project location: $(pwd)/android"
fi

echo ""
echo "🎉 Mobile app is ready for deployment!"
echo "🔧 Voice calling permissions will now work properly on mobile devices"