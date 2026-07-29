import { auth, db } from "../lib/db";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  getDocFromServer
} from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";

export interface Clinic {
  id: string;
  name: string;
  ownerId: string;
  logoUrl?: string;
  tagline?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  whatsappLink?: string; // Section D
  formspreeId?: string; // Section D
  subscriptionPlan: "basic" | "pro" | "enterprise";
  subscriptionStatus: "active" | "inactive" | "trial";
  subscriptionExpiry: string;
  // Pricing & Modes (Section E)
  onlineConsultationFee?: number;
  physicalConsultationFee?: number;
  consultationModes?: ("Online" | "Physical")[];
  // Advanced Features (Section F)
  aiAnalyzerEnabled?: boolean;
  preferredLabs?: string[];
  privacyAgreementAccepted?: boolean;
  // Slot Management (Section E)
  businessHours?: {
    [key: string]: { // e.g. "monday"
      isOpen: boolean;
      slots: { start: string; end: string }[];
      breaks: { start: string; end: string }[];
    }
  };
  settings?: {
    themeColor?: string;
    enableAI?: boolean;
    enableVideo?: boolean;
    whatsappNumber?: string;
  };
  createdAt: string;
}

export interface Patient {
  id?: string;
  uid?: string;
  clinicId: string;
  patientId?: string;
  khcId?: string;
  name: string;
  phone: string;
  mobileNumber?: string;
  isMobileVerified?: boolean;
  email?: string;
  dob?: string;
  gender?: "Male" | "Female" | "Other";
  address?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory?: string;
  isVerified?: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface Appointment {
  id?: string;
  clinicId: string;
  patientId: string;
  patientUid?: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  time: string;
  type: "Online" | "Offline";
  status: "Scheduled" | "Completed" | "Cancelled" | "scheduled" | "cancelled" | "completed" | "in-progress" | "payment-pending" | "pending";
  reason?: string;
  hasVoiceNote?: boolean;
  videoLink?: string;
  fee?: number;
  phone?: string;
  commissionAmount?: number;
  doctorNetShare?: number;
  createdAt?: string;
}

export interface Medication {
  name: string;
  potency: string;
  dosage: string;
}

export interface Prescription {
  id?: string;
  clinicId: string;
  patientId: string;
  patientUid?: string;
  doctorId?: string;
  appointmentId?: string;
  symptoms: string;
  diagnosis: string;
  medications: Medication[];
  advice?: string;
  followupDate?: string;
  createdAt: string;
}

export interface InventoryItem {
  id?: string;
  clinicId: string;
  name: string;
  category: string;
  stockLevel: number;
  unit: string;
  price: number;
  lastUpdated: string;
}

export interface Invoice {
  id?: string;
  clinicId: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  amount: number;
  fee?: number;
  commissionAmount?: number;
  doctorNetShare?: number;
  status: "Pending" | "Paid" | "Partially Paid" | "Cancelled" | "Refunded" | "Failed";
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  items: { description: string; price: number; quantity?: number }[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  photoURL?: string;
  name?: string;
  role: "doctor" | "patient" | "clinic_admin" | "super_admin";
  clinicId?: string; // ID of the clinic they belong to
  ownedClinicId?: string; // For clinic_admin, the ID of the clinic they own
  subscription?: string;
  subscriptionExpiry?: string;
  consultationFee?: number;
  followUpFee?: number;
  commissionRate?: number;
  specialization?: string;
  experience?: number; // Total years
  qualification?: string;
  stateBoardRegistrationNumber?: string;
  nchRegistrationNumber?: string;
  registrationYear?: string;
  // Personal Profile (Section A)
  gender?: "Male" | "Female" | "Other";
  dob?: string;
  languages?: string[];
  // Professional Details (Section B)
  specializations?: string[]; // Multiple categories
  degreeUrl?: string;
  registrationCertificateUrl?: string;
  // Legal & Compliance (Section C)
  digitalSignatureUrl?: string;
  identityProofUrl?: string;
  identityProofType?: "Aadhar" | "PAN" | "VoterID";
  telemedicineConsent?: boolean;
  disclaimerAccepted?: boolean;
  // Metadata
  clinicName?: string;
  clinicAddress?: string;
  city?: string;
  area?: string;
  pincode?: string;
  mobileNumber?: string;
  isMobileVerified?: boolean;
  isEmailVerified?: boolean;
  isVerified?: boolean;
  // Onboarding status
  isOnboarded?: boolean;
  onboardingStep?: number;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  rating?: number;
  patientCount?: number;
  createdAt?: string;
}

export interface Feedback {
  id?: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  patientUid?: string;
  patientName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  clinicId?: string;
}

export interface SymptomLog {
  id?: string;
  patientId: string;
  patientUid?: string;
  symptoms: string;
  severity: number; // 1-10
  mood: string;
  energyLevel: string;
  sleepQuality: string;
  appetite: string;
  thirst: string;
  notes?: string;
  createdAt: string;
}

export interface Report {
  id?: string;
  clinicId?: string;
  patientId: string;
  patientUid: string;
  patientName: string;
  title: string;
  fileName: string;
  fileType: string;
  reportUrl: string;
  status: "Pending Analysis" | "Analyzed";
  category: "Radiology" | "Pathology" | "Others";
  doctorId?: string;
  summary?: string;
  findings?: { parameter: string; value: string; result: 'Normal' | 'Abnormal'; reference?: string }[];
  clinicalGuidance?: string;
  rubricsSuggested?: string[];
  fullAnalysis?: string;
  ambossVerified?: string;
  glassInsights?: string;
  homeopathicMatches?: string;
  synthesisRubrics?: {
    rubricName: string;
    repertoryChapter: string;
    sourceAbnormalFinding: string;
    remediesAssociated: { remedy: string; grade: number }[];
  }[];
  createdAt: string;
  analyzedAt?: string;
}
