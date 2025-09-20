// Admin Assignment Script for OwnParks
// Run this script to assign admin role to ajfhr31@gmail.com

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
const serviceAccount = require('./serviceAccountKey.json'); // Add your Firebase service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Add your project ID here
});

const db = admin.firestore();

async function assignAdminRole() {
  try {
    console.log('🔍 Searching for user: ajfhr31@gmail.com...');
    
    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', 'ajfhr31@gmail.com').get();
    
    if (snapshot.empty) {
      console.log('❌ User not found with email: ajfhr31@gmail.com');
      console.log('📝 User must register in the app first before becoming admin');
      return;
    }
    
    let userDoc;
    snapshot.forEach(doc => {
      userDoc = { id: doc.id, ...doc.data() };
    });
    
    console.log('✅ User found:', userDoc.name || userDoc.email);
    
    // Update user to admin role
    await usersRef.doc(userDoc.id).update({
      role: 'super_admin',
      assignedBy: 'system',
      roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('🎉 SUCCESS! User ajfhr31@gmail.com is now a Super Admin');
    console.log('👑 They can now access the Admin Panel in the app');
    
  } catch (error) {
    console.error('❌ Error assigning admin role:', error);
  }
}

// Run the function
assignAdminRole();
