# Security Specification - Kayra’s Homeo Care

## Data Invariants
1. A patient cannot see other patients' data.
2. A doctor can only see data from their clinic.
3. Appointments must belong to a valid clinic and have a status from the allowed set.
4. Clinic administrators can manage their clinic's staff and inventory.
5. Invoices can only be created by doctors/admins and viewed by the relevant patient/doctor.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create an appointment with another doctor's ID.
2. **Clinic Hopping**: Attempt to fetch appointments for a `clinicId` the user does not belong to.
3. **Role Escalation**: Attempt to update own user profile to `role: 'super_admin'`.
4. **PII Leak**: A patient attempting to list all `users` to find other patients' emails.
5. **Inventory Theft**: A patient attempting to update medication prices.
6. **Appointment Hijacking**: A patient attempting to change the `status` of their own appointment to 'Completed' without paying.
7. **Report Poisoning**: A doctor from clinic A attempting to view medical reports of clinic B.
8. **Malicious ID**: Attempting to create a document with a 1MB string as ID.
9. **Shadow Fields**: Attempting to add `isAdmin: true` to a patient profile.
10. **State Shortcut**: Moving an appointment from 'Scheduled' to 'Completed' without an `updatedAt` timestamp.
11. **PII Blanket Read**: Authenticated user calling `getDocs(collection(db, 'users'))` without filters.
12. **Orphaned Record**: Creating a prescription for a non-existent patient ID.

## Test Runner (Logic Overview)
The `firestore.rules` will be verified against these scenarios using logical assertions in the match blocks.
- `isValidId()` for path hardening.
- `isValidAppointment()` for schema integrity.
- `isSameClinic()` for tenant isolation.
- `affectedKeys().hasOnly()` for controlled updates.
