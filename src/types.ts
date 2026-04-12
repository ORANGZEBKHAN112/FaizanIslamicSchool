export type UserRole = 'Super Admin' | 'Admin' | 'Teacher' | 'Accountant' | 'Student';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  role: UserRole;
  campusId?: string;
  isActive: boolean;
  createdOn: string;
  uid?: string;
}

export interface Campus {
  id: string;
  campusCode: string;
  campusName: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdOn: string;
}

export interface Class {
  id: string;
  campusId: string;
  className: string;
  sectionName?: string;
  capacity?: number;
  shift?: string;
}

export interface Student {
  id: string;
  campusId: string;
  classId: string;
  serialNo?: string;
  dateOfBirth?: string;
  admissionDate?: string;
  registrationDate?: string;
  gender?: string;
  studentCode?: string;
  rollNumber: string;
  contactNumber?: string;
  cnicBForm?: string;
  address?: string;
  campusName?: string;
  country?: string;
  province?: string;
  city?: string;
  tehsil?: string;
  firstName: string;
  lastName?: string;
  fatherName?: string;
  className?: string;
  sectionName?: string;
  session?: string;
  status: 'Active' | 'Left' | 'Graduated';
  outstandingFees: number;
  campusType?: string;
  profileImage?: string;
}

export interface FeeStructure {
  id: string;
  campusId: string;
  classId: string;
  tuitionFee: number;
  admissionFee: number;
  examFee: number;
  transportFee: number;
  miscFee: number;
}

export interface FeeVoucher {
  id: string;
  studentId: string;
  campusId: string;
  voucherMonth: number;
  voucherYear: number;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  generatedOn: string;
  lateFine?: number;
  studentName?: string;
  rollNumber?: string;
}

export interface Fee {
  id: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  amount: number;
  month: number;
  year: number;
  status: 'Unpaid' | 'Pending' | 'Paid';
  transactionRef?: string;
  paymentMethod?: string;
  paymentDate?: string;
  dueDate: string;
  createdAt?: string;
  campusId?: string;
}

export interface QuickPayConfig {
  id: string;
  merchantId: string;
  apiKey: string;
  callbackUrl: string;
  mode: 'Sandbox' | 'Live';
  isEnabled: boolean;
}

export interface Transaction {
  id: string;
  studentId: string;
  voucherId: string;
  amount: number;
  status: 'Pending' | 'Success' | 'Failed';
  transactionDate: string;
  responseLog?: string;
}

export interface LoginRequest {
  username: string;
  passwordHash: string;
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  campusId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface FeeSetting {
  id: string;
  classId: string;
  className?: string;
  monthlyFee: number;
  admissionFee: number;
  securityFee: number;
  lastUpdated: string;
}
