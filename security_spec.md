# Security Specification - Kayra's Homeo Care

## 1. Data Invariants
- An appointment cannot exist without a valid patientId and doctorId.
- A prescription MUST be linked to an existing appointment and patient.
- Medical reports containing PII are only accessible to the owner and the doctor.
- Patient profiles (users collection) can only be created with the user's own UID.
- Doctors cannot modify patient profile fields like 'mobile' after initial registration.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to create a document in `users/` with a `uid` that doesn't match `request.auth.uid`.
2. **PII Leak**: Authenticated Patient A attempts to `get` the profile of Patient B.
3. **Ghost Field Update**: Authenticated Patient attempts to update their own profile with `isAdmin: true` or `isVerified: true`.
4. **Orphaned Prescription**: Attempt to create a prescription without a valid `appointmentId` (using `exists()`).
5. **Role Escalation**: Patient attempts to write a document to the `doctors/` collection.
6. **Update Gap**: Patient attempts to change the `fees` or `qualification` in a doctor's profile.
7. **Resource Poisoning**: Attempt to create an appointment with an ID that is 2KB long or contains dangerous characters.
8. **State Shortcut**: Patient attempts to update an appointment status directly from `pending` to `completed` (this should be doctor-only).
9. **Timestamp Spoofing**: Attempt to create an appointment with a `createdAt` date in the future (not using `request.time`).
10. **Shadow Field**: Doctor attempts to add a `hiddenNote` field to the patient profile that isn't in the schema.
11. **Total Array Poisoning**: Attempt to inject 10,000 items into the `medicines` array of a prescription.
12. **Recursive List Query**: Patient attempts to list ALL prescriptions without a `where` filter on `patientId`.

## 3. Test Runner Concept
The tests will ensure that each of these malicious payloads returns `PERMISSION_DENIED`.
