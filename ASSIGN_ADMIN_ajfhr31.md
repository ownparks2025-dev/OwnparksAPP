# Assign Admin Access to ajfhr31@gmail.com

## Method 1: Firebase Console (Recommended)

### Step 1: Access Firebase Console
1. Go to https://console.firebase.google.com
2. Sign in with your Google account
3. Select your **OwnParks** project

### Step 2: Navigate to Firestore
1. Click on **"Firestore Database"** in the left sidebar
2. Make sure you're in the **"Data"** tab

### Step 3: Find the User
1. Look for the **"users"** collection
2. Search through the user documents to find one with:
   - **email**: `ajfhr31@gmail.com`
   - OR search by document ID if you know it

### Step 4: Edit User Document
1. Click on the user document for ajfhr31@gmail.com
2. Click **"Edit document"** or the pencil icon

### Step 5: Add Admin Fields
Add these fields to the user document:

```
Field Name: role
Type: string
Value: super_admin
```

```
Field Name: assignedBy
Type: string  
Value: system
```

```
Field Name: roleAssignedAt
Type: timestamp
Value: (click "Use server timestamp")
```

### Step 6: Save Changes
1. Click **"Update"** to save the changes
2. Verify the fields have been added correctly

## Method 2: If User Doesn't Exist Yet

If ajfhr31@gmail.com hasn't registered in your app yet:

1. **Ask them to register** in the OwnParks app first
2. Once they complete registration, follow Method 1 above
3. OR manually create a user document:

```json
{
  "uid": "generated-user-id",
  "name": "Admin User",
  "email": "ajfhr31@gmail.com",
  "phone": "+1234567890",
  "role": "super_admin",
  "assignedBy": "system",
  "roleAssignedAt": "2024-08-28T11:30:00Z",
  "kycStatus": "verified",
  "createdAt": "2024-08-28T11:30:00Z",
  "portfolio": [],
  "kycDocs": {
    "idProof": "",
    "addressProof": ""
  }
}
```

## Verification Steps

After assigning admin access:

### 1. Check in Firebase Console
- Verify the user document shows `role: "super_admin"`
- Confirm `assignedBy` and `roleAssignedAt` fields exist

### 2. Test in App
1. Have ajfhr31@gmail.com login to the app
2. They should see the **Admin Panel** card on main screen
3. Clicking it should open the admin interface
4. They should see all admin tabs (Dashboard, Users, Lots, Investments, Settings)

### 3. Admin Panel Access
Once logged in as admin, they can:
- ✅ View all users and their KYC status
- ✅ Approve/reject KYC documents  
- ✅ Manage parking lots
- ✅ View investments and payouts
- ✅ Assign admin roles to other users
- ✅ Access system settings

## Role Permissions

**Super Admin** (what you're assigning):
- 👑 Highest level access
- Can assign/remove admin roles
- Can manage all aspects of the system
- Cannot be removed if they're the last super admin

## Troubleshooting

**Problem**: Can't find user in Firebase Console
- **Solution**: User must register in the app first

**Problem**: Admin Panel not showing after login
- **Solution**: Check that `role` field is exactly `"super_admin"`

**Problem**: "Permission denied" errors
- **Solution**: Check Firebase security rules allow role updates

**Problem**: Fields not saving
- **Solution**: Make sure field names are exactly: `role`, `assignedBy`, `roleAssignedAt`

## Success Confirmation

✅ **User document updated with admin role**  
✅ **User can login and see Admin Panel**  
✅ **Admin functions work correctly**  
✅ **Can assign roles to other users**  

---

**Status**: Ready to assign admin access to ajfhr31@gmail.com  
**Role**: Super Admin (highest level)  
**Access**: Full admin panel and system management
