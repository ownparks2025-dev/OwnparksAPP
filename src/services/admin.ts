import { auth, db } from './firebase';
import { User, ParkingLot, Investment, AdminReport } from '../types';

// Admin Authentication Functions
export const checkAdminAccess = async (userId: string): Promise<boolean> => {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      return userData.role === 'admin' || userData.role === 'super_admin';
    }
    
    return false;
  } catch (error: any) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

export const getCurrentUserRole = async (): Promise<'user' | 'admin' | 'super_admin' | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      return userData.role || 'user';
    }
    
    return 'user';
  } catch (error: any) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const promoteUserToAdmin = async (userId: string): Promise<void> => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      role: 'admin',
      updatedAt: new Date()
    });
  } catch (error: any) {
    throw new Error(`Failed to promote user to admin: ${error.message}`);
  }
};

export const revokeAdminAccess = async (userId: string): Promise<void> => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      role: 'user',
      updatedAt: new Date()
    });
  } catch (error: any) {
    throw new Error(`Failed to revoke admin access: ${error.message}`);
  }
};

// Enhanced Admin Role Management
export const assignUserRole = async (
  userId: string, 
  role: 'user' | 'admin' | 'super_admin', 
  assignedByUserId: string
): Promise<void> => {
  try {
    // Check if assigner has permission
    const assignerRole = await getCurrentUserRole();
    if (assignerRole !== 'super_admin' && role === 'super_admin') {
      throw new Error('Only super admins can assign super admin role');
    }
    
    if (assignerRole === 'user') {
      throw new Error('Insufficient permissions to assign roles');
    }
    
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      role: role,
      updatedAt: new Date(),
      roleAssignedBy: assignedByUserId,
      roleAssignedAt: new Date()
    });
  } catch (error: any) {
    throw new Error(`Failed to assign role: ${error.message}`);
  }
};

export const getAdminUsers = async (): Promise<User[]> => {
  try {
    const usersRef = db.collection('users');
    const adminQuery = usersRef.where('role', 'in', ['admin', 'super_admin']);
    const adminSnapshot = await adminQuery.get();
    
    const adminUsers: User[] = [];
    adminSnapshot.forEach((doc) => {
      adminUsers.push({ uid: doc.id, ...doc.data() } as User);
    });
    
    return adminUsers;
  } catch (error: any) {
    throw new Error(`Failed to get admin users: ${error.message}`);
  }
};

export const validateAdminAction = async (
  actionType: string,
  targetUserId?: string,
  additionalData?: any
): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data() as User;
    const userRole = userData.role;
    
    // Super admin can do everything
    if (userRole === 'super_admin') return true;
    
    // Regular admin permissions
    if (userRole === 'admin') {
      // Admins can't modify other admins or super admins
      if (targetUserId) {
        const targetUser = await db.collection('users').doc(targetUserId).get();
        if (targetUser.exists) {
          const targetUserData = targetUser.data() as User;
          if (targetUserData.role === 'admin' || targetUserData.role === 'super_admin') {
            return false;
          }
        }
      }
      
      // Define allowed actions for regular admins
       const allowedActions = [
         'view_users',
         'update_user_kyc',
         'view_investments',
         'approve_investment',
         'reject_investment',
         'view_parking_lots',
         'create_parking_lot',
         'update_parking_lot'
       ];
      
      return allowedActions.includes(actionType);
    }
    
    return false;
  } catch (error: any) {
    console.error('Error validating admin action:', error);
    return false;
  }
};

// User Management Functions
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const users: User[] = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      // Convert Firestore timestamps to JavaScript Date objects
      const user = {
        uid: doc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt || new Date(),
        roleAssignedAt: userData.roleAssignedAt?.toDate ? userData.roleAssignedAt.toDate() : userData.roleAssignedAt
      } as User;
      users.push(user);
    });
    
    // Get investment counts for each user
    const investmentsRef = db.collection('investments');
    const investmentsSnapshot = await investmentsRef.get();
    
    const investmentCounts: { [userId: string]: number } = {};
    investmentsSnapshot.forEach((doc) => {
      const investment = doc.data() as Investment;
      investmentCounts[investment.userId] = (investmentCounts[investment.userId] || 0) + 1;
    });
    
    // Get active parking lots count
    const parkingLotsRef = db.collection('parkingLots');
    const activeLots = parkingLotsRef.where('availability', '==', true);
    const activeLotsSnapshot = await activeLots.get();
    const activeLotsCount = activeLotsSnapshot.size;
    
    return users.map(user => ({
      ...user,
      investmentCount: investmentCounts[user.uid] || 0,
      totalActiveInvestments: activeLotsCount
    }));
  } catch (error: any) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
};

export const updateUserKYCStatus = async (userId: string, status: 'pending' | 'verified' | 'rejected', notes?: string): Promise<void> => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      kycStatus: status,
      kycNotes: notes || '',
      kycUpdatedAt: new Date()
    });
  } catch (error: any) {
    throw new Error(`Failed to update KYC status: ${error.message}`);
  }
};

export const getUsersByKYCStatus = async (status: 'pending' | 'verified' | 'rejected'): Promise<User[]> => {
  try {
    const usersRef = db.collection('users');
    const q = usersRef.where('kycStatus', '==', status);
    const usersSnapshot = await q.get();
    
    const users: User[] = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      // Convert Firestore timestamps to JavaScript Date objects
      const user = {
        uid: doc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt || new Date(),
        roleAssignedAt: userData.roleAssignedAt?.toDate ? userData.roleAssignedAt.toDate() : userData.roleAssignedAt
      } as User;
      users.push(user);
    });
    
    return users;
  } catch (error: any) {
    throw new Error(`Failed to get users by KYC status: ${error.message}`);
  }
};

export const getUserInvestmentHistory = async (userId: string): Promise<Investment[]> => {
  try {
    const investmentsRef = db.collection('investments');
    const userInvestments = investmentsRef.where('userId', '==', userId);
    const investmentsSnapshot = await userInvestments.get();
    
    const investments: Investment[] = [];
    investmentsSnapshot.forEach((doc) => {
      investments.push({ investmentId: doc.id, ...doc.data() } as Investment);
    });
    
    return investments;
  } catch (error: any) {
    throw new Error(`Failed to get user investment history: ${error.message}`);
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const userRef = db.collection('users').doc(userId);
    
    // Note: In a production app, you might want to soft delete or archive user data
    // instead of permanently deleting it for compliance reasons
    await userRef.delete();
  } catch (error: any) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

// Parking Lot Management Functions
export const getAllParkingLots = async (): Promise<ParkingLot[]> => {
  try {
    const parkingLotsRef = db.collection('parkingLots');
    const parkingLotsSnapshot = await parkingLotsRef.get();
    
    const parkingLots: ParkingLot[] = [];
    parkingLotsSnapshot.forEach((doc) => {
      parkingLots.push({ id: doc.id, ...doc.data() } as ParkingLot);
    });
    
    return parkingLots;
  } catch (error: any) {
    throw new Error(`Failed to get parking lots: ${error.message}`);
  }
};

export const createParkingLot = async (parkingLotData: Omit<ParkingLot, 'id'>): Promise<string> => {
  try {
    const parkingLotsRef = db.collection('parkingLots');
    const docRef = await parkingLotsRef.add({
      ...parkingLotData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return docRef.id;
  } catch (error: any) {
    throw new Error(`Failed to create parking lot: ${error.message}`);
  }
};

export const updateParkingLot = async (lotId: string, updates: Partial<ParkingLot>): Promise<void> => {
  try {
    const lotRef = db.collection('parkingLots').doc(lotId);
    await lotRef.update({
      ...updates,
      updatedAt: new Date()
    });
  } catch (error: any) {
    throw new Error(`Failed to update parking lot: ${error.message}`);
  }
};

export const deleteParkingLot = async (lotId: string): Promise<void> => {
  try {
    // Check if there are any active investments for this lot
    const investmentsRef = db.collection('investments');
    const lotInvestments = investmentsRef.where('parkingLotId', '==', lotId);
    const investmentsSnapshot = await lotInvestments.get();
    
    if (!investmentsSnapshot.empty) {
      throw new Error('Cannot delete parking lot with active investments');
    }
    
    const lotRef = db.collection('parkingLots').doc(lotId);
    await lotRef.delete();
  } catch (error: any) {
    throw new Error(`Failed to delete parking lot: ${error.message}`);
  }
};

// Investment Management Functions
export const getAllInvestments = async (): Promise<Investment[]> => {
  try {
    const investmentsRef = db.collection('investments');
    const investmentsSnapshot = await investmentsRef.orderBy('createdAt', 'desc').get();
    
    const investments: Investment[] = [];
    investmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert Firestore timestamps to Date objects
      const investment: Investment = {
        investmentId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        paymentConfirmedAt: data.paymentConfirmedAt?.toDate ? data.paymentConfirmedAt.toDate() : (data.paymentConfirmedAt ? new Date(data.paymentConfirmedAt) : undefined),
      } as Investment;
      
      investments.push(investment);
    });
    
    return investments;
  } catch (error: any) {
    throw new Error(`Failed to get investments: ${error.message}`);
  }
};

export const updateInvestmentStatus = async (
  investmentId: string, 
  updates: Partial<Investment>
): Promise<void> => {
  try {
    const investmentRef = db.collection('investments').doc(investmentId);
    await investmentRef.update({
      ...updates,
      updatedAt: new Date()
    });
  } catch (error: any) {
    throw new Error(`Failed to update investment status: ${error.message}`);
  }
};

export const getInvestmentsByStatus = async (status: 'pending' | 'success' | 'failed'): Promise<Investment[]> => {
  try {
    const investmentsRef = db.collection('investments');
    const q = investmentsRef.where('status', '==', status);
    const investmentsSnapshot = await q.get();
    
    const investments: Investment[] = [];
    investmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert Firestore timestamps to Date objects
      const investment: Investment = {
        investmentId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        paymentConfirmedAt: data.paymentConfirmedAt?.toDate ? data.paymentConfirmedAt.toDate() : (data.paymentConfirmedAt ? new Date(data.paymentConfirmedAt) : undefined),
      } as Investment;
      
      investments.push(investment);
    });
    
    return investments;
  } catch (error: any) {
    throw new Error(`Failed to get investments by status: ${error.message}`);
  }
};

// Enhanced Investment Management
export const createInvestmentAfterOfflinePayment = async (
  userId: string,
  parkingLotId: string,
  amount: number,
  selectedLots: number,
  paymentMethod: string,
  adminNotes?: string
): Promise<string> => {
  try {
    const investmentData = {
      userId,
      parkingLotId,
      amount,
      selectedLots,
      paymentMethod,
      status: 'success' as const,
      adminApprovalStatus: 'pending' as const,
      createdAt: new Date(),
      adminNotes: adminNotes || '',
      createdByAdmin: true
    };
    
    const investmentRef = await db.collection('investments').add(investmentData);
    
    // Update user's total investment
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      const currentTotal = userData.totalInvestment || 0;
      
      await userRef.update({
        totalInvestment: currentTotal + amount,
        lastInvestmentDate: new Date()
      });
    }
    
    // Update parking lot available lots
    const parkingLotRef = db.collection('parkingLots').doc(parkingLotId);
    const parkingLotDoc = await parkingLotRef.get();
    
    if (parkingLotDoc.exists) {
      const parkingLotData = parkingLotDoc.data() as ParkingLot;
      const currentAvailableLots = parkingLotData.availableLots || 0;
      const newAvailableLots = Math.max(0, currentAvailableLots - selectedLots);
      
      await parkingLotRef.update({
        availableLots: newAvailableLots,
        availability: newAvailableLots > 0,
        lastUpdated: new Date()
      });
    }
    
    return investmentRef.id;
  } catch (error: any) {
    throw new Error(`Failed to create investment: ${error.message}`);
  }
};

// Bulk Operations (removed payout functions)

// Enhanced Admin Functions
// Enhanced workflow: One-click approval after payment confirmation
export const approveInvestmentAfterPayment = async (
  investmentId: string, 
  adminNotes?: string,
  autoApprove: boolean = false
): Promise<void> => {
  try {
    const investmentRef = db.collection('investments').doc(investmentId);
    const investmentDoc = await investmentRef.get();
    
    if (!investmentDoc.exists) {
      throw new Error('Investment not found');
    }
    
    const investmentData = investmentDoc.data() as Investment;
    
    // Verify payment is confirmed before approval
    if (investmentData.paymentStatus !== 'success') {
      throw new Error('Payment must be confirmed before approval');
    }
    
    // Update investment status to approved
    await investmentRef.update({
      paymentStatus: 'success',
      adminApprovalStatus: 'approved',
      adminNotes: adminNotes || (autoApprove ? 'Auto-approved after payment confirmation' : ''),
      approvedAt: new Date(),
      approvedBy: auth.currentUser?.uid,
      paymentConfirmedAt: new Date(),
      paymentConfirmedBy: auth.currentUser?.uid
    });
    
    // Update user's approved investment total
    const userRef = db.collection('users').doc(investmentData.userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      const currentApprovedTotal = userData.approvedInvestmentTotal || 0;
      
      await userRef.update({
        approvedInvestmentTotal: currentApprovedTotal + (investmentData.amount || 0),
        lastApprovedInvestmentDate: new Date()
      });
    }
    
    // Update parking lot if needed
    const parkingLotRef = db.collection('parkingLots').doc(investmentData.parkingLotId);
    const parkingLotDoc = await parkingLotRef.get();
    
    if (parkingLotDoc.exists) {
      const parkingLotData = parkingLotDoc.data() as ParkingLot;
      const currentInvestedAmount = parkingLotData.totalInvestedAmount || 0;
      
      // Check if this is an offline payment (created by admin)
      // For offline payments, lots were already subtracted during creation
      const isOfflinePayment = !!investmentData.createdByAdmin;
      
      if (isOfflinePayment) {
        // For offline payments, only update invested amount (lots already subtracted)
        await parkingLotRef.update({
          totalInvestedAmount: currentInvestedAmount + (investmentData.amount || 0),
          lastInvestmentDate: new Date(),
          updatedAt: new Date()
        });
      } else {
        // For online payments, subtract lots and update invested amount
        const currentAvailableLots = parkingLotData.availableLots || 0;
        const selectedLots = investmentData.selectedLots || 1;
        
        // Validate that there are enough available lots
        if (currentAvailableLots < selectedLots) {
          throw new Error(`Insufficient available lots. Only ${currentAvailableLots} lots available, but ${selectedLots} requested.`);
        }
        
        const newAvailableLots = Math.max(0, currentAvailableLots - selectedLots);
        
        await parkingLotRef.update({
          totalInvestedAmount: currentInvestedAmount + (investmentData.amount || 0),
          availableLots: newAvailableLots,
          availability: newAvailableLots > 0,
          lastInvestmentDate: new Date(),
          updatedAt: new Date()
        });
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to approve investment: ${error.message}`);
  }
};

// Batch approval for multiple investments
export const batchApproveInvestments = async (
  investmentIds: string[], 
  adminNotes?: string
): Promise<{ successful: string[], failed: { id: string, error: string }[] }> => {
  const successful: string[] = [];
  const failed: { id: string, error: string }[] = [];
  
  for (const investmentId of investmentIds) {
    try {
      await approveInvestmentAfterPayment(investmentId, adminNotes);
      successful.push(investmentId);
    } catch (error: any) {
      failed.push({ id: investmentId, error: error.message });
    }
  }
  
  return { successful, failed };
};

export const approveInvestment = async (investmentId: string, adminNotes?: string): Promise<void> => {
  try {
    const investmentRef = db.collection('investments').doc(investmentId);
    const investmentDoc = await investmentRef.get();
    
    if (!investmentDoc.exists) {
      throw new Error('Investment not found');
    }
    
    const investmentData = investmentDoc.data() as Investment;
    
    await investmentRef.update({
      adminApprovalStatus: 'approved',
      adminNotes: adminNotes || '',
      approvedAt: new Date(),
      approvedBy: auth.currentUser?.uid
    });
    
    // Update user's approved investment total
    const userRef = db.collection('users').doc(investmentData.userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data() as User;
      const currentApprovedTotal = userData.approvedInvestmentTotal || 0;
      
      await userRef.update({
        approvedInvestmentTotal: currentApprovedTotal + (investmentData.amount || 0),
        lastApprovedInvestmentDate: new Date()
      });
    }
    
    // Update parking lot if needed
    const parkingLotRef = db.collection('parkingLots').doc(investmentData.parkingLotId);
    const parkingLotDoc = await parkingLotRef.get();
    
    if (parkingLotDoc.exists) {
      const parkingLotData = parkingLotDoc.data() as ParkingLot;
      const currentInvestedAmount = parkingLotData.totalInvestedAmount || 0;
      
      // Check if this is an offline payment (created by admin)
      // For offline payments, lots were already subtracted during creation
      const isOfflinePayment = !!investmentData.createdByAdmin;
      
      if (isOfflinePayment) {
        // For offline payments, only update invested amount (lots already subtracted)
        await parkingLotRef.update({
          totalInvestedAmount: currentInvestedAmount + (investmentData.amount || 0),
          lastInvestmentDate: new Date(),
          updatedAt: new Date()
        });
      } else {
        // For online payments, subtract lots and update invested amount
        const currentAvailableLots = parkingLotData.availableLots || 0;
        const selectedLots = investmentData.selectedLots || 1;
        
        // Validate that there are enough available lots
        if (currentAvailableLots < selectedLots) {
          throw new Error(`Insufficient available lots. Only ${currentAvailableLots} lots available, but ${selectedLots} requested.`);
        }
        
        const newAvailableLots = Math.max(0, currentAvailableLots - selectedLots);
        
        await parkingLotRef.update({
          totalInvestedAmount: currentInvestedAmount + (investmentData.amount || 0),
          availableLots: newAvailableLots,
          availability: newAvailableLots > 0,
          lastInvestmentDate: new Date(),
          updatedAt: new Date()
        });
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to approve investment: ${error.message}`);
  }
};

export const rejectInvestment = async (investmentId: string, reason: string): Promise<void> => {
  try {
    const investmentRef = db.collection('investments').doc(investmentId);
    const investmentDoc = await investmentRef.get();
    
    if (!investmentDoc.exists) {
      throw new Error('Investment not found');
    }
    
    await investmentRef.update({
      adminApprovalStatus: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date(),
      rejectedBy: auth.currentUser?.uid
    });
  } catch (error: any) {
    throw new Error(`Failed to reject investment: ${error.message}`);
  }
};

export const getPendingInvestments = async (): Promise<Investment[]> => {
  try {
    const investmentsRef = db.collection('investments');
    const q = investmentsRef
      .where('adminApprovalStatus', '==', 'pending')
      .where('status', '==', 'success');
    
    const querySnapshot = await q.get();
    
    const investments: Investment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert Firestore timestamps to Date objects
      const investment: Investment = {
        investmentId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        paymentConfirmedAt: data.paymentConfirmedAt?.toDate ? data.paymentConfirmedAt.toDate() : (data.paymentConfirmedAt ? new Date(data.paymentConfirmedAt) : undefined),
      } as Investment;
      
      investments.push(investment);
    });
    
    return investments;
  } catch (error: any) {
    throw new Error(`Failed to get pending investments: ${error.message}`);
  }
};

// Analytics and Reporting
export const getSystemStats = async () => {
  try {
    // Get all collections data
    const [usersSnapshot, investmentsSnapshot, parkingLotsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('investments').get(),
      db.collection('parkingLots').get()
    ]);
    
    // Calculate user metrics
    let verifiedUsers = 0;
    let pendingKYC = 0;
    
    usersSnapshot.forEach((doc) => {
      const user = doc.data() as User;
      if (user.kycStatus === 'verified') {
        verifiedUsers++;
      } else if (user.kycStatus === 'pending') {
        pendingKYC++;
      }
    });
    
    // Calculate parking lot metrics
    let availableLots = 0;
    parkingLotsSnapshot.forEach((doc) => {
      const lot = doc.data() as ParkingLot;
      if (lot.status === 'active') {
        availableLots++;
      }
    });
    
    // Calculate investment metrics
    let totalInvestmentValue = 0;
    let successfulInvestments = 0;
    let totalROI = 0;
    let roiCount = 0;
    
    investmentsSnapshot.forEach((doc) => {
      const investment = doc.data() as Investment;
      totalInvestmentValue += investment.amount || 0;
      
      if (investment.adminApprovalStatus === 'approved') {
        successfulInvestments++;
      }
      
      if (investment.expectedROI) {
        totalROI += investment.expectedROI;
        roiCount++;
      }
    });
    
    const averageROI = roiCount > 0 ? totalROI / roiCount : 0;
    
    return {
      totalUsers: usersSnapshot.size,
      verifiedUsers,
      pendingKYC,
      totalParkingLots: parkingLotsSnapshot.size,
      availableLots,
      totalInvestments: investmentsSnapshot.size,
      successfulInvestments,
      totalInvestmentValue,
      averageROI
    };
  } catch (error: any) {
    throw new Error(`Failed to get system stats: ${error.message}`);
  }
};

export const getAdminAnalytics = async () => {
  try {
    // Get all collections data
    const [usersSnapshot, investmentsSnapshot, parkingLotsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('investments').get(),
      db.collection('parkingLots').get()
    ]);
    
    // Calculate total investment amount
    let totalInvestment = 0;
    investmentsSnapshot.forEach((doc) => {
      const investment = doc.data() as Investment;
      totalInvestment += investment.amount || 0;
    });
    
    // Calculate active parking lots
    let activeParkingLots = 0;
    parkingLotsSnapshot.forEach((doc) => {
      const lot = doc.data() as ParkingLot;
      if (lot.status === 'active') {
        activeParkingLots++;
      }
    });
    
    return {
      totalUsers: usersSnapshot.size,
      totalInvestment,
      activeParkingLots,
      monthlyRevenue: 0 // Removed payout-based revenue calculation
    };
  } catch (error: any) {
    throw new Error(`Failed to get admin analytics: ${error.message}`);
  }
};

export const getAdminDashboardData = async (): Promise<AdminReport> => {
  try {
    // Get all collections data
    const [usersSnapshot, investmentsSnapshot, parkingLotsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('investments').get(),
      db.collection('parkingLots').get()
    ]);
    
    // Calculate metrics
    const totalUsers = usersSnapshot.size;
    const totalInvestments = investmentsSnapshot.size;
    const totalParkingLots = parkingLotsSnapshot.size;
    
    let totalInvestmentAmount = 0;
    let pendingInvestments = 0;
    let approvedInvestments = 0;
    
    investmentsSnapshot.forEach((doc) => {
      const investment = doc.data() as Investment;
      totalInvestmentAmount += investment.amount || 0;
      
      if (investment.adminApprovalStatus === 'pending') {
        pendingInvestments++;
      } else if (investment.adminApprovalStatus === 'approved') {
        approvedInvestments++;
      }
    });
    
    return {
      totalUsers,
      totalInvestments,
      totalParkingLots,
      totalInvestmentAmount,
      pendingInvestments,
      approvedInvestments,
      generatedAt: new Date()
    };
  } catch (error: any) {
    throw new Error(`Failed to get admin dashboard data: ${error.message}`);
  }
};

// Additional User Management Functions
export const countAdminUsers = async () => {
  try {
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    let admins = 0;
    let superAdmins = 0;
    
    usersSnapshot.forEach((doc) => {
      const user = doc.data() as User;
      if (user.role === 'admin') {
        admins++;
      } else if (user.role === 'super_admin') {
        superAdmins++;
      }
    });
    
    return { admins, superAdmins };
  } catch (error: any) {
    throw new Error(`Failed to count admin users: ${error.message}`);
  }
};

export const bulkUpdateKYCStatus = async (userIds: string[], status: 'pending' | 'verified' | 'rejected', notes?: string): Promise<void> => {
  try {
    const batch = db.batch();
    
    userIds.forEach((userId) => {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        kycStatus: status,
        kycNotes: notes || '',
        kycUpdatedAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    await batch.commit();
  } catch (error: any) {
    throw new Error(`Failed to bulk update KYC status: ${error.message}`);
  }
};

export const canRemoveAdmin = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    // Get current user role
    const currentUserRef = db.collection('users').doc(currentUserId);
    const currentUserDoc = await currentUserRef.get();
    
    if (!currentUserDoc.exists) {
      return false;
    }
    
    const currentUser = currentUserDoc.data() as User;
    
    // Only super admins can remove admin roles
    if (currentUser.role !== 'super_admin') {
      return false;
    }
    
    // Get target user role
    const targetUserRef = db.collection('users').doc(targetUserId);
    const targetUserDoc = await targetUserRef.get();
    
    if (!targetUserDoc.exists) {
      return false;
    }
    
    const targetUser = targetUserDoc.data() as User;
    
    // If target is not a super admin, can remove
    if (targetUser.role !== 'super_admin') {
      return true;
    }
    
    // If target is a super admin, check if there are other super admins
    const usersRef = db.collection('users');
    const superAdminsSnapshot = await usersRef.where('role', '==', 'super_admin').get();
    
    // Count super admins excluding the target user
    let otherSuperAdmins = 0;
    superAdminsSnapshot.forEach((doc) => {
      if (doc.id !== targetUserId) {
        otherSuperAdmins++;
      }
    });
    
    // Can only remove if there's at least one other super admin
    return otherSuperAdmins > 0;
  } catch (error: any) {
    console.error('Error checking if admin can be removed:', error);
    return false;
  }
};

// Data Export Functions
export const exportSystemData = async () => {
  try {
    // Fetch all data in parallel
    const [users, investments, parkingLots] = await Promise.all([
      getAllUsers(),
      getAllInvestments(),
      getAllParkingLots()
    ]);

    // Format data for CSV export
    const formatDate = (date: any) => {
      if (!date) return '';
      if (date.toDate) return date.toDate().toLocaleDateString();
      if (date instanceof Date) return date.toLocaleDateString();
      return new Date(date).toLocaleDateString();
    };

    // Format users data
    const usersData = users.map(user => ({
      'User ID': user.uid,
      'Name': user.name || '',
      'Email': user.email || '',
      'Phone': user.phone || '',
      'KYC Status': user.kycStatus || '',
      'Role': user.role || '',
      'Created At': formatDate(user.createdAt),
      'Investment Count': user.investmentCount || 0
    }));

    // Format investments data
    const investmentsData = investments.map(investment => {
      const user = users.find(u => u.uid === investment.userId);
      const parkingLot = parkingLots.find(lot => lot.id === investment.parkingLotId);
      
      return {
        'Investment ID': investment.investmentId,
        'User Name': user?.name || 'Unknown',
        'User Email': user?.email || 'Unknown',
        'Parking Lot': parkingLot?.name || 'Unknown',
        'Amount': investment.amount || 0,
        'Payment Status': investment.paymentStatus || '',
        'Admin Approval': investment.adminApprovalStatus || '',
        'Selected Lots': investment.selectedLots || 0,
        'Payment Method': investment.paymentMethod || '',
        'Created At': formatDate(investment.createdAt),
        'Lease Accepted': investment.leaseAccepted ? 'Yes' : 'No'
      };
    });

    // Format parking lots data
    const parkingLotsData = parkingLots.map(lot => ({
      'Lot ID': lot.id,
      'Name': lot.name || '',
      'Location': lot.location || '',
      'Price': lot.price || 0,
      'ROI': lot.roi || 0,
      'Available': lot.availability ? 'Yes' : 'No',
      'Total Lots': lot.totalLots || 0,
      'Available Lots': lot.availableLots || 0,
      'Details': lot.details || ''
    }));

    return {
      users: usersData,
      investments: investmentsData,
      parkingLots: parkingLotsData,
      summary: {
        totalUsers: users.length,
        totalInvestments: investments.length,
        totalParkingLots: parkingLots.length,
        totalInvestmentAmount: investments.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        exportedAt: new Date().toLocaleString()
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to export system data: ${error.message}`);
  }
};

export const generateCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
};

// Export auth and db for use in other files
export { auth, db };
