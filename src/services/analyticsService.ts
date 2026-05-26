import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/db';
import { Appointment, Prescription, Invoice } from '../types';

export interface DashboardStats {
  revenue: number;
  revenueChange: number;
  patients: number;
  patientsChange: number;
  appointments: number;
  appointmentsChange: number;
  rating: number;
  reviewCount: number;
}

export async function getDashboardStats(doctorId?: string, clinicId?: string): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  try {
    // 1. Get Invoices for Revenue
    const invoicePath = 'invoices';
    let invoiceQ;
    if (clinicId) {
      invoiceQ = query(collection(db, invoicePath), where('clinicId', '==', clinicId));
    } else {
      invoiceQ = query(collection(db, invoicePath), where('doctorId', '==', doctorId));
    }
    
    let invoiceSnap;
    try {
      invoiceSnap = await getDocs(invoiceQ);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, invoicePath);
      throw e;
    }
    const invoices = invoiceSnap.docs.map(doc => doc.data() as Invoice);
    
    const currentMonthRevenue = invoices
      .filter(i => new Date(i.createdAt) >= startOfMonth)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      
    const lastMonthRevenue = invoices
      .filter(i => {
        const d = new Date(i.createdAt);
        return d >= startOfLastMonth && d < startOfMonth;
      })
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const revenueChange = lastMonthRevenue === 0 ? 100 : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    // 2. Get Appointments
    const apptPath = 'appointments';
    let apptQ;
    if (clinicId) {
      apptQ = query(collection(db, apptPath), where('clinicId', '==', clinicId));
    } else {
      apptQ = query(collection(db, apptPath), where('doctorId', '==', doctorId));
    }
    
    let apptSnap;
    try {
      apptSnap = await getDocs(apptQ);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, apptPath);
      throw e;
    }
    const appointments = apptSnap.docs.map(doc => doc.data() as Appointment);
    
    const currentMonthAppts = appointments.filter(a => new Date(a.date) >= startOfMonth).length;
    const lastMonthAppts = appointments.filter(a => {
      const d = new Date(a.date);
      return d >= startOfLastMonth && d < startOfMonth;
    }).length;
    
    const apptsChange = lastMonthAppts === 0 ? 100 : ((currentMonthAppts - lastMonthAppts) / lastMonthAppts) * 100;

    // 3. Get Patients (Unique per doctor/clinic)
    const patients = new Set(appointments.map(a => a.patientId)).size;
    // For change, we would need to track enrollment date, assuming 10% for now or 0 if no data
    
    // 4. Get Rating
    const feedbackPath = 'feedbacks';
    let feedbackQ;
    if (clinicId) {
      feedbackQ = query(collection(db, feedbackPath), where('clinicId', '==', clinicId));
    } else {
      feedbackQ = query(collection(db, feedbackPath), where('doctorId', '==', doctorId));
    }
    
    let feedbackSnap;
    try {
      feedbackSnap = await getDocs(feedbackQ);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, feedbackPath);
      throw e;
    }
    const feedbacks = feedbackSnap.docs.map(doc => doc.data());
    const rating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;

    return {
      revenue: currentMonthRevenue,
      revenueChange: Math.round(revenueChange),
      patients,
      patientsChange: 5, // Mock change for now
      appointments: currentMonthAppts,
      appointmentsChange: Math.round(apptsChange),
      rating: parseFloat(rating.toFixed(1)),
      reviewCount: feedbacks.length
    };
  } catch (error) {
    console.error("Analytics Error (Handled):", error);
    return {
      revenue: 0,
      revenueChange: 0,
      patients: 0,
      patientsChange: 0,
      appointments: 0,
      appointmentsChange: 0,
      rating: 0,
      reviewCount: 0
    };
  }
}

export async function getRevenueChartData(doctorId?: string, clinicId?: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = months.map(name => ({ name, revenue: 0, patients: 0 }));
  
  try {
    const invoicePath = 'invoices';
    let invoiceQ;
    if (clinicId) {
      invoiceQ = query(collection(db, invoicePath), where('clinicId', '==', clinicId));
    } else {
      invoiceQ = query(collection(db, invoicePath), where('doctorId', '==', doctorId));
    }
    
    let invoiceSnap;
    try {
      invoiceSnap = await getDocs(invoiceQ);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, invoicePath);
      throw e;
    }
    
    invoiceSnap.docs.forEach(doc => {
      const inv = doc.data() as Invoice;
      const date = new Date(inv.createdAt);
      const monthIdx = date.getMonth();
      data[monthIdx].revenue += (Number(inv.amount) || 0);
    });

    const apptPath = 'appointments';
    let apptQ;
    if (clinicId) {
      apptQ = query(collection(db, apptPath), where('clinicId', '==', clinicId));
    } else {
      apptQ = query(collection(db, apptPath), where('doctorId', '==', doctorId));
    }
    
    let apptSnap;
    try {
      apptSnap = await getDocs(apptQ);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, apptPath);
      throw e;
    }
    
    apptSnap.docs.forEach(doc => {
      const appt = doc.data() as Appointment;
      const date = new Date(appt.date);
      const monthIdx = date.getMonth();
      data[monthIdx].patients += 1;
    });

    return data;
  } catch (error) {
    return data;
  }
}
