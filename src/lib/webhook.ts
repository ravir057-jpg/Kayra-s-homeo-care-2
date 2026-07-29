import { db } from './db';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Enterprise-grade Automated Status Trigger Service
 * 
 * DESIGNED FOR NON-CODER MEDICINE PRACTITIONERS:
 * When patient bookings or doctor licenses change state (e.g., from 'pending' to 'scheduled'),
 * this function records the state event inside a dedicated 'webhook_events' collection on Firebase.
 * This event log acts as a hardwired "status trigger" that is ideal for linking with Zapier, Make.com,
 * or background cloud-based webhook services for automations (such as sending custom SMS or WhatsApps).
 */
export async function triggerWebhookStatusUpdate(
  eventType: 'APPOINTMENT_STATE' | 'MEDICAL_REPORT_STATE' | 'SUBSCRIPTION_STATE',
  status: string,
  entityId: string,
  payload: Record<string, any>
) {
  try {
    const eventLog = {
      eventId: `event_${Math.random().toString(36).substring(2, 11)}`,
      eventType,
      status, // New status state (e.g. 'Confirmed', 'Analyzed', 'Pro Practice')
      entityId, // ID of the patient doctor appointment or report doc
      payload: {
        ...payload,
        platformName: "Kayra's Homeo Care",
        environment: "production-live"
      },
      triggeredAt: new Date().toISOString(),
      processed: false // Ready for background notification trigger processors
    };

    // 1. Direct Persistent Log in Firestore
    await addDoc(collection(db, 'webhook_events'), eventLog);
    console.log(`[Status Trigger] Webhook status recorded cleanly: ${eventType} -> ${status} for ID: ${entityId}`);

    // 2. HTTP POST Fallback to Developer configuration if registered
    const webhookUrl = (import.meta as any).env?.VITE_NOTIFICATION_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform-Source': 'KayraHomeoCare'
        },
        body: JSON.stringify(eventLog)
      }).catch(err => {
        console.warn('[Status Trigger] Dev webhook notification delivery paused:', err.message);
      });
    }
  } catch (error) {
    console.warn('[Status Trigger] Event recording logged locally. Cloud relay paused.', error);
  }
}
