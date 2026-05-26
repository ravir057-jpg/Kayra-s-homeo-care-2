import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './db';

export type AuditEntityType = 'Patient' | 'Appointment' | 'Prescription' | 'Invoice' | 'Inventory' | 'Feedback';

export interface AuditLogData {
  action: string;
  clinicId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  details?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export async function logAction(data: AuditLogData) {
  const user = auth.currentUser;
  if (!user) return;

  const path = 'audit_logs';
  try {
    await addDoc(collection(db, path), {
      userId: user.uid,
      userEmail: user.email,
      clinicId: data.clinicId || null,
      action: data.action,
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      details: data.details || null,
      severity: data.severity || 'info',
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      },
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // We don't want audit logging failures to block the main action if possible, 
    // but we should still handle the error for debugging.
    console.warn('Audit Log failed:', error);
    // Note: We don't call handleFirestoreError here to avoid infinite loops if it were used within handleFirestoreError
  }
}
