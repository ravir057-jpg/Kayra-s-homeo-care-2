# Security Specification: Kayra Homeo Care

## Data Invariants
1. A patient record must have a unique ID, valid name, and phone.
2. Appointments must be linked to an existing patient.
3. Prescriptions are immutable once created (historical health records).
4. Only doctors can update inventory and view all billing.
5. Patients can only view their own data (profile, appointments, prescriptions, invoices).
6. Roles are stored in `/users/{userId}` and cannot be modified by the user themselves.

## The Dirty Dozen Payloads (to be rejected)
1. **Identity Theft**: Patient A trying to read Patient B's prescription.
2. **Role Escalation**: Patient trying to update their role to 'doctor' in `/users`.
3. **Ghost Invoices**: Patient trying to mark their own invoice as 'Paid' without a valid transaction.
4. **Inventory Sabotage**: Patient trying to delete medicine stock.
5. **ID Poisoning**: Creating a patient with a 2MB string as ID.
6. **Immutable Breach**: Doctor trying to change a prescription written 6 months ago.
7. **Orphaned Appointment**: Creating an appointment for a non-existent patient ID.
8. **Shadow Data**: Adding `isHacker: true` to a patient profile.
9. **Spam Appointments**: Creating 10,000 appointments in 1 second (handled by rate limits + rules).
10. **Admin Bypass**: Trying to access `/inventory` without being a doctor.
11. **PII Leak**: Unauthenticated user trying to list all patients.
12. **Future Poisoning**: Setting `createdAt` to a date in 2099.

## Test Runner
See `firestore.rules.test.ts` (conceptual).
