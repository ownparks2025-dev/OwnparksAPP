export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: string;
  panNumber?: string;
  aadharNumber?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  role: 'user' | 'admin' | 'super_admin';
  assignedBy?: string; // uid of admin who assigned the role
  roleAssignedAt?: Date;
  kycDocs: {
    idProof: string;
    addressProof: string;
    selfie?: string;
  };
  portfolio: string[];
  createdAt: Date;
  lastLoginAt?: Date;
  totalInvestment?: number;
  approvedInvestmentTotal?: number;
  investmentCount?: number;
}

export interface ParkingLot {
  id: string;
  name: string;
  location: string;
  price: number;
  roi: number;
  availability: boolean;
  details: string;
  images: string[];
  totalLots: number;
  availableLots: number;
  status?: 'active' | 'inactive' | 'pending';
  totalInvestedAmount?: number;
}

export interface Investment {
  investmentId: string;
  userId: string;
  parkingLotId: string;
  leaseAccepted: boolean;
  paymentStatus: 'success' | 'pending' | 'failed';
  adminApprovalStatus: 'pending' | 'approved' | 'rejected';
  amount: number;
  selectedLots?: number;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt?: Date;
  paymentConfirmedAt?: Date;
  createdByAdmin?: string;
  expectedROI?: number;
}

export interface AdminReport {
  totalUsers: number;
  totalInvestments: number;
  totalParkingLots: number;
  totalInvestmentAmount: number;
  pendingInvestments: number;
  approvedInvestments: number;
  generatedAt: Date;
}

export interface KYCFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  idProof?: string;
  addressProof?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface PayoutRecord {
  payoutId: string;
  amount: number;
  date?: Date;
  investmentId?: string;
}

