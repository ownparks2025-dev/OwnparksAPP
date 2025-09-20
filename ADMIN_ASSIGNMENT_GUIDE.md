# Admin Assignment System - OwnParks

## How to Assign Someone as Admin

### Method 1: Database Direct Assignment (Recommended for First Admin)

1. **Access your Firebase Console**:
   - Go to https://console.firebase.google.com
   - Select your OwnParks project
   - Navigate to Firestore Database

2. **Find the User**:
   - Go to the `users` collection
   - Find the user document by email or name
   - Click on the document to edit it

3. **Add Admin Role**:
   ```javascript
   // Add these fields to the user document:
   role: "admin"  // or "super_admin" for highest privileges
   assignedBy: "your-user-id"  // your admin user ID
   roleAssignedAt: new Date()  // current timestamp
   ```

4. **Save Changes**:
   - Click "Update" to save the changes
   - The user now has admin access

### Method 2: Using Admin Panel (After First Admin is Set)

1. **Log into the App as Admin**
2. **Navigate to Admin Panel** → **Users Tab**
3. **Find the User** you want to make admin
4. **Click on User** to open details modal
5. **Admin Assignment Section** will appear with role options:
   - **Make Admin**: Grants admin privileges
   - **Make Super Admin**: Grants highest privileges (super admins only)
   - **Remove Admin**: Removes admin privileges

### Method 3: Using Admin Service Functions

```typescript
// In your admin code, use these functions:
import { assignUserRole, auth } from '../services/admin';

// To make someone admin:
await assignUserRole('target-user-id', 'admin', auth.currentUser?.uid);

// To make someone super admin (requires super admin privileges):
await assignUserRole('target-user-id', 'super_admin', auth.currentUser?.uid);

// To remove admin privileges:
await assignUserRole('target-user-id', 'user', auth.currentUser?.uid);
```

## Admin Role Hierarchy

### **Super Admin**
- Can assign/remove admin and super admin roles
- Can access all admin functions
- Cannot be removed if they're the last super admin
- Full system control

### **Admin**
- Can manage users (KYC approval, user management)
- Can manage parking lots and investments
- Cannot assign admin roles to others
- Cannot remove other admins

### **User**
- Regular user with no admin privileges
- Standard app functionality only

## Security Features

1. **Role Validation**: All admin functions check user role before execution
2. **Last Admin Protection**: Cannot remove the last super admin
3. **Assignment Logging**: All role changes are tracked with assigner info
4. **Permission Checks**: Actions require appropriate role level

## Current Implementation Status

✅ **Admin service functions created**  
✅ **User types updated with role fields**  
✅ **Admin filter added to user management**  
✅ **Role validation functions implemented**  
✅ **Admin counting and protection mechanisms**  

## Quick Start Steps

1. **Create your first admin** using Method 1 (Firebase Console)
2. **Login to the app** with your admin account
3. **Go to Admin Panel** → **Users** to manage other users
4. **Use the admin filter** to see current admins
5. **Assign new admins** using the user detail modals

## Admin Panel Access

- The **Admin Panel** card is visible in the Main App screen
- Click **Admin Panel** → **Users** tab
- Use the **Admins** filter to see current administrators
- Admin assignment options appear based on your role level

## Troubleshooting

**Can't access admin panel?**
- Check that your user document has `role: "admin"` or `role: "super_admin"`

**Assignment button not appearing?**
- Only admins can see assignment options
- Super admins can assign super admin roles
- Regular admins cannot assign admin roles

**Error when assigning roles?**
- Check Firebase security rules allow role updates
- Verify the assigner has sufficient permissions
- Ensure target user exists in the database

## Example Firebase Document Structure

```json
{
  "uid": "user123",
  "name": "John Admin",
  "email": "admin@ownparks.com",
  "phone": "+1234567890",
  "role": "super_admin",
  "assignedBy": "creator-user-id",
  "roleAssignedAt": "2024-08-28T10:00:00Z",
  "kycStatus": "verified",
  "createdAt": "2024-01-01T10:00:00Z",
  "portfolio": [],
  "kycDocs": {
    "idProof": "document-url",
    "addressProof": "document-url"
  }
}
```
