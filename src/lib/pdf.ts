import { jsPDF } from "jspdf";
import { UserProfile, Prescription, Patient, Medication, Invoice } from "../types";

export function generatePrescriptionPDF(doctor: UserProfile | null, patient: Patient, prescription: Prescription) {
  const doc = new jsPDF({
    format: 'a5',
    orientation: 'portrait'
  });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(0, 50, 100);
  doc.text("KAYRA HOMEO CARE", 10, 15);
  doc.setFontSize(8);
  doc.setTextColor(100);
  const doctorTitle = doctor?.name || "Dr. Rajesh Kumar";
  const doctorSub = `${doctor?.qualification || "Classical Homeopath"} | ${doctor?.specialization || "General Practice"}`;
  doc.text(doctorTitle, 10, 20);
  doc.text(doctorSub, 10, 24);
  doc.line(10, 26, 138, 26);

  // Patient Info
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Patient: ${patient.name}`, 10, 34);
  doc.text(`Age/Sex: ${patient.dob ? calculateAge(patient.dob) : 'N/A'} / ${patient.gender || 'N/A'}`, 10, 39);
  doc.text(`Date: ${new Date(prescription.createdAt).toLocaleDateString()}`, 110, 34);

  // Clinical Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Dx:", 10, 49);
  doc.setFont("helvetica", "normal");
  doc.text(prescription.diagnosis || 'N/A', 20, 49);

  // Rx Symbol
  doc.setFontSize(18);
  doc.text("Rx", 10, 59);

  // Medications
  doc.setFontSize(10);
  let y = 69;
  prescription.medications.forEach((med: Medication, index: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${med.name} ${med.potency}`, 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Dosage: ${med.dosage}`, 15, y + 5);
    y += 12;
  });

  // Advice
  if (prescription.advice) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Advice:", 10, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(prescription.advice, 120), 10, y + 5);
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  const regNo = doctor?.stateBoardRegistrationNumber || doctor?.nchRegistrationNumber || "Regd.";
  doc.text(`Regd. No: ${regNo} | Mobile: +91 99318 64619`, 10, 200);

  return doc;
}

export function generateInvoicePDF(doctor: UserProfile | null, patient: Patient, invoice: Invoice) {
  const doc = new jsPDF({
    format: 'a4',
    orientation: 'portrait'
  });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(doctor?.clinicName || "KAYRA HOMEO CARE", 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(doctor?.clinicAddress || "Digital Healthcare Excellence", 105, 27, { align: 'center' });
  
  // Invoice Details
  doc.setDrawColor(240);
  doc.line(10, 35, 200, 35);
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 10, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice ID: ${invoice.id?.toUpperCase() || 'DRAFT'}`, 10, 52);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 10, 57);
  
  // Patient Info
  doc.setFont("helvetica", "bold");
  doc.text("BILLED TO:", 140, 45);
  doc.setFont("helvetica", "normal");
  doc.text(patient.name, 140, 52);
  doc.text(patient.phone, 140, 57);
  if (patient.email) doc.text(patient.email, 140, 62);
  
  // Table Header
  let y = 80;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(10, y, 190, 10, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("Description", 15, y + 7);
  doc.text("Qty", 140, y + 7);
  doc.text("Price", 160, y + 7);
  doc.text("Total", 185, y + 7, { align: 'right' });
  
  // Table Content
  y += 10;
  doc.setFont("helvetica", "normal");
  invoice.items.forEach((item) => {
    const qty = item.quantity || 1;
    doc.text(item.description, 15, y + 10);
    doc.text(qty.toString(), 140, y + 10);
    doc.text(`Rs. ${item.price.toFixed(2)}`, 160, y + 10);
    doc.text(`Rs. ${(item.price * qty).toFixed(2)}`, 185, y + 10, { align: 'right' });
    y += 12;
  });
  
  // Totals
  y += 10;
  doc.line(130, y, 200, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", 130, y);
  doc.setFontSize(14);
  doc.text(`Rs. ${invoice.amount.toFixed(2)}`, 185, y, { align: 'right' });
  
  // Status Stamp
  y += 20;
  doc.setFontSize(10);
  if (invoice.status === 'Paid') {
    doc.setTextColor(16, 185, 129);
    doc.rect(10, y, 40, 12);
    doc.text("PAID IN FULL", 14, y + 8);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.rect(10, y, 40, 12);
    doc.text(invoice.status.toUpperCase(), 14, y + 8);
  }
  
  // Footer
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text("This is a computer generated document. No signature is required.", 105, 280, { align: 'center' });

  return doc;
}

function calculateAge(dob: string) {
  const birthDate = new Date(dob);
  const diff = Date.now() - birthDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
}
