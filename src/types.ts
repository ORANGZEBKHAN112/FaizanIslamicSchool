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
  rollNumber: string;
  firstName: string;
  lastName?: string;
  fatherName?: string;
  dateOfBirth?: string;
  gender?: string;
  mobile?: string;
  address?: string;
  admissionDate?: string;
  profileImage?: string;
  status: 'Active' | 'Left' | 'Graduated';
  outstandingFees: number;
}

export interface Staff {
  id: string;
  fullName: string;
  cnic: string;
  qualification: string;
  salary: number;
  joiningDate: string;
  campusId: string;
  role: UserRole;
  email: string;
  isActive: boolean;
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
}

export interface ExamTerm {
  id: string;
  termName: string; // Monthly, Mid, Final, Test Session
  campusId: string;
  status: 'Active' | 'Locked';
}

export interface DateSheet {
  id: string;
  examTermId: string;
  classId: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  invigilatorId?: string;
}

export interface GradePolicy {
  id: string;
  minPercentage: number;
  maxPercentage: number;
  grade: string;
  gpa: number;
  remarks: string;
}

export interface Exam {
  id: string;
  campusId: string;
  examName: string;
  examDate: string;
  totalMarks: number;
  examTermId?: string;
}

export interface StudentResult {
  id: string;
  examId: string;
  studentId: string;
  subjectName: string;
  obtainedMarks: number;
  totalMarks: number;
  grade: string;
  remarks?: string;
  status: 'Present' | 'Absent' | 'Cheating' | 'Withheld';
  isDraft: boolean;
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
