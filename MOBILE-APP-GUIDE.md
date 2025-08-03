# TrendoTalk Mobile App - Play Store Deployment Guide

## Overview
This guide walks you through converting your TrendoTalk web app into a mobile app and publishing it to the Google Play Store.

## Prerequisites

### Required Software
1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **Java Development Kit (JDK) 11 or higher**
3. **Node.js** (already installed in Replit)
4. **Google Play Console Account** - $25 one-time registration fee

### Required Accounts
1. **Google Play Console Developer Account**
2. **Google Cloud Console Account** (for app signing)

## Step 1: Update Server Configuration

First, update your Capacitor configuration with your actual Replit app URL:

1. Open `capacitor.config.ts`
2. Replace `https://your-app-domain.replit.app` with your actual Replit URL
3. Example: `https://trendotalk.your-username.repl.co`

```typescript
server: {
  url: 'https://your-actual-replit-url.repl.co',
  cleartext: true
}
```

## Step 2: Build the Mobile App

### Option A: Using the Build Script (Recommended)
```bash
# Build and prepare the mobile app
bash build-mobile.sh

# Build and open Android Studio
bash build-mobile.sh --open
```

### Option B: Manual Build
```bash
# 1. Build the web app
npm run build

# 2. Copy assets to Capacitor
npx cap copy

# 3. Sync Capacitor
npx cap sync

# 4. Open Android Studio
npx cap open android
```

## Step 3: Configure Android Studio

1. **Install Android Studio** on your local machine
2. **Open the project** from the `android` folder
3. **Set up SDK**: Tools > SDK Manager
   - Install Android 13+ (API level 33+)
   - Install build tools and platform tools

## Step 4: Generate App Icons and Assets

The app already includes:
- ✅ App icon (SVG format in `resources/android/icon/`)
- ✅ Splash screen (SVG format in `resources/android/splash/`)
- ✅ Proper permissions in AndroidManifest.xml
- ✅ TrendoTalk branding colors

## Step 5: Build Release APK/AAB

### For Testing (APK)
1. In Android Studio: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
2. APK will be generated in `app/build/outputs/apk/debug/`

### For Play Store (AAB - Required)
1. In Android Studio: `Build > Generate Signed Bundle / APK`
2. Choose `Android App Bundle`
3. Create a new keystore (save it securely!)
4. Fill in your information:
   - **Key store password**: Create a strong password
   - **Key alias**: trendotalk-key
   - **Key password**: Create a strong password
   - **Validity**: 25+ years
   - **First and Last Name**: Your name
   - **Organization**: Your company/name
   - **Country**: Your country code

**⚠️ IMPORTANT**: Save your keystore file and passwords securely! You'll need them for all future updates.

## Step 6: Prepare Play Store Assets

### Required Images (Create these)
1. **App Icon**: 512x512px PNG (high-res)
2. **Feature Graphic**: 1024x500px PNG
3. **Screenshots**: 
   - Phone: 16:9 or 9:16 ratio
   - Tablet: 16:10 or 10:16 ratio
   - Minimum 2, maximum 8 screenshots
4. **Promo Video** (optional): YouTube URL

### App Store Listing Info
```
App Name: TrendoTalk
Short Description: Connect, Share, and Trend with friends
Full Description: 
TrendoTalk is the ultimate social media platform where you can:
• Share photos, videos, and stories with friends
• Create and watch trending content  
• Direct messaging with file sharing
• Circle's Vibe - 24-hour stories feature
• Real-time notifications and updates
• Discover new trends and connect with like-minded people

Join the TrendoTalk community and start trending today!

Category: Social
Content Rating: Teen (13+) - Social features, user-generated content
```

## Step 7: Google Play Console Setup

1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay the $25 registration fee
3. Create a new app:
   - **App name**: TrendoTalk
   - **Default language**: English (US)
   - **App or game**: App
   - **Free or paid**: Free

## Step 8: Upload and Configure

### App Bundle Upload
1. Go to `Production > Releases`
2. Click `Create new release`
3. Upload your `.aab` file
4. Add release notes

### Store Listing
1. Upload all your images and assets
2. Fill in app description and details
3. Add privacy policy URL (required)
4. Set content rating
5. Add contact information

### App Access
1. Set up any required permissions explanations
2. Configure target audience and content
3. Add app category and tags

## Step 9: Privacy Policy (Required)

Create a privacy policy that covers:
- Data collection (user accounts, posts, messages)
- Camera and storage permissions
- Third-party services (Cloudinary, SendGrid)
- Contact information

Host it on your website or use services like:
- [privacypolicytemplate.net](https://privacypolicytemplate.net)
- [termsfeed.com](https://termsfeed.com)

## Step 10: Testing and Review

### Internal Testing
1. Upload AAB to `Internal testing` first
2. Test all app features:
   - Login/signup
   - Photo/video upload
   - Messaging
   - Stories/vibes
   - Admin features

### Production Release
1. After testing, promote to production
2. Submit for review
3. Review process: 1-3 days typically

## App Updates

### For Future Updates:
1. Update version in `android/app/build.gradle`:
   ```gradle
   versionCode 2
   versionName "1.1"
   ```
2. Build new AAB with same keystore
3. Upload to Play Console
4. Add release notes

## Important Configuration Files

### Key Files Created/Modified:
- ✅ `capacitor.config.ts` - Main Capacitor configuration
- ✅ `android/app/src/main/AndroidManifest.xml` - Permissions and app config
- ✅ `android/app/src/main/res/values/strings.xml` - App strings
- ✅ `android/app/src/main/res/values/colors.xml` - App colors
- ✅ `resources/android/icon/icon.svg` - App icon
- ✅ `resources/android/splash/splash.svg` - Splash screen
- ✅ `build-mobile.sh` - Build script

## Troubleshooting

### Common Issues:

1. **Build Errors**: Make sure Android SDK is properly installed
2. **Network Issues**: Update server URL in capacitor.config.ts
3. **Permission Errors**: Check AndroidManifest.xml permissions
4. **Upload Errors**: Ensure AAB is signed with your keystore

### Support:
- Capacitor Docs: [capacitorjs.com/docs](https://capacitorjs.com/docs)
- Play Console Help: [support.google.com/googleplay](https://support.google.com/googleplay)

## Success Checklist

- [ ] Capacitor properly configured with your Replit URL
- [ ] Mobile app builds successfully
- [ ] All features tested on mobile
- [ ] App icons and assets created
- [ ] Keystore generated and saved securely
- [ ] AAB file built and signed
- [ ] Google Play Console account created
- [ ] Privacy policy created and hosted
- [ ] Store listing completed with all assets
- [ ] App submitted for review

## Cost Summary
- Google Play Console: $25 (one-time)
- Domain for privacy policy: ~$10/year (optional)
- Total: ~$35 to get started

🎉 **Congratulations!** Your TrendoTalk app is ready for the Google Play Store!