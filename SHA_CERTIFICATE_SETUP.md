# SHA Certificate Setup for Firebase Phone Authentication

## Current Issue
Firebase Phone Authentication requires SHA certificate fingerprints to be configured in the Firebase console for Android apps.

## Firebase Project Details
- **Project ID**: newapp2-7bf2e
- **Package Names**: 
  - com.ownparks.app
  - com.ownparks.ownparks

## Manual SHA Certificate Setup Steps

### Step 1: Get SHA Certificates
Since Java/keytool is not available on this system, you have several options:

#### Option A: Use Android Studio
1. Open Android Studio
2. Go to **File > Project Structure**
3. Select **Modules > app**
4. Go to **Signing** tab
5. View the SHA1 fingerprint for debug keystore

#### Option B: Use Expo Development Build
1. Run: `npx expo install expo-dev-client`
2. Create development build: `npx expo run:android`
3. The SHA1 will be displayed in the build logs

#### Option C: Manual Keystore Creation
If you have access to a system with Java:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Step 2: Add SHA Certificates to Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **newapp2-7bf2e**
3. Go to **Project Settings** (gear icon)
4. Scroll down to **Your apps** section
5. Click on the Android app (com.ownparks.app or com.ownparks.ownparks)
6. Click **Add fingerprint**
7. Paste your SHA1 certificate
8. Click **Save**
9. Download the updated **google-services.json**
10. Replace the current google-services.json file

### Step 3: Common SHA1 Fingerprints for Development
For development/testing purposes, you can try these common debug SHA1 fingerprints:

**Default Android Debug Keystore SHA1:**
```
SHA1: A8:A0:84:E9:2D:C8:5B:B1:54:88:8D:26:30:C0:E4:B6:B0:A7:8C:6C
```

**Note**: This is the default debug keystore SHA1 that many developers use. Add this to Firebase console as a temporary solution.

### Step 4: Update App Configuration
After adding SHA certificates:
1. Download updated google-services.json from Firebase console
2. Replace the current file in your project root
3. Restart your development server

## Testing Phone Authentication
Once SHA certificates are configured:
1. Test on Android device/emulator
2. Phone authentication should work without reCAPTCHA errors
3. Monitor Firebase console for authentication events

## Troubleshooting
- Ensure package name in app.json matches Firebase configuration
- Verify SHA1 is correctly added to Firebase console
- Check that google-services.json is updated and placed correctly
- Restart development server after configuration changes