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

export interface Patient {
  id?: string;
  uid?: string;
  patientId?: string;
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
  patientId: string;
  patientUid?: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  time: string;
  type: "Online" | "Offline";
  status: "Scheduled" | "Completed" | "Cancelled";
  reason?: string;
  hasVoiceNote?: boolean;
  videoLink?: string;
}

export interface Medication {
  name: string;
  potency: string;
  dosage: string;
}

export interface Prescription {
  id?: string;
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
  name: string;
  category: string;
  stockLevel: number;
  unit: string;
  price: number;
  lastUpdated: string;
}

export interface Invoice {
  id?: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  amount: number;
  status: "Pending" | "Paid" | "Partially Paid" | "Cancelled" | "Refunded" | "Failed";
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
  role: "doctor" | "patient";
  subscription?: string;
  subscriptionExpiry?: string;
  consultationFee?: number;
  followUpFee?: number;
  specialization?: string;
  experience?: number;
  qualification?: string;
  stateBoardRegistrationNumber?: string;
  nchRegistrationNumber?: string;
  clinicName?: string;
  clinicAddress?: string;
  mobileNumber?: string;
  isMobileVerified?: boolean;
  isEmailVerified?: boolean;
  isVerified?: boolean;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
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
