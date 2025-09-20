# Firebase Security Rules Deployment Guide

## Issue Fixed
This deployment will fix the "Missing or insufficient permissions" error when loading portfolio stats.

## Files Created
- `firestore.rules` - Firestore database security rules
- `storage.rules` - Firebase Storage security rules  
- `firebase.json` - Firebase project configuration
- `firestore.indexes.json` - Database indexes for performance

## Manual Deployment Steps

### Method 1: Firebase Console (Recommended)

#### Step 1: Deploy Firestore Rules
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **newapp2-7bf2e**
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish** to deploy

#### Step 2: Deploy Storage Rules
1. In Firebase Console, go to **Storage** → **Rules** tab
2. Copy the contents of `storage.rules` file
3. Paste into the rules editor
4. Click **Publish** to deploy

### Method 2: Firebase CLI (If Available)

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Deploy only rules
firebase deploy --only firestore:rules,storage

# Or deploy everything
firebase deploy
```

## What These Rules Allow

### Firestore Rules
- ✅ Users can read/write their own user documents
- ✅ Users can read their own investments
- ✅ Users can read all parking lots
- ✅ Admins can read/write all data
- ✅ Proper authentication checks

### Storage Rules
- ✅ Users can upload/access their own files
- ✅ KYC documents are properly secured
- ✅ Admins can access all files when needed

## Security Features
- All operations require authentication
- Users can only access their own data
- Admin role verification for sensitive operations
- Proper data isolation between users

## Testing After Deployment

1. **Restart the app** to clear any cached permissions
2. **Login with a valid user account**
3. **Check the main screen** - portfolio stats should load without errors
4. **Verify in browser console** - no more permission denied errors

## Troubleshooting

**Still getting permission errors?**
- Verify rules were deployed successfully
- Check that user is properly authenticated
- Ensure user document exists in Firestore
- Restart the app completely

**Rules not taking effect?**
- Rules can take a few minutes to propagate
- Clear browser cache and restart app
- Check Firebase Console for rule deployment status

## Project Configuration
- **Project ID**: newapp2-7bf2e
- **Rules Files**: firestore.rules, storage.rules
- **Config File**: firebase.json

---

**Status**: Rules created and ready for deployment
**Impact**: Fixes portfolio stats loading permissions error
**Required**: Manual deployment to Firebase Console