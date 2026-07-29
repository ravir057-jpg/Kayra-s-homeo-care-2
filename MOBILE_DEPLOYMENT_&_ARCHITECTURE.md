# Kayra’s Homeo Care: Mobile-First Deployment & Scalable Architecture
*An Executive Deployment Guide & Architectural Blueprint for Founder-Managed Production Environments*

This document serves as the high-fidelity source of truth for **Kayra's Homeo Care**. It is explicitly optimized for a **BHMS Homeopathic Physician (Non-Coder Founder)** to review, manage, and deploy directly via a **Mobile Device** (connected to Render/Railway + GitHub) without complex terminal access.

---

## 1. PRODUCT REQUIREMENT DOCUMENT (PRD) — CORE SPECIFICATION

### Essential Goal
To seamlessly scale **Kayra's Homeo Care** from a high-touch single Homeopathic Clinic to a multi-tenant, subscription-based Multi-Doctor Marketplace, leveraging highly cost-effective, low-maintenance, mobile-manageable cloud components.

### Core Product Modules
1. **Patient Care Hub & Subscription Portal**
   - **Clinical Registration**: Low-friction OTP-powered registration and identity check.
   - **Intake Flow**: Full support for virtual and offline consultation channels.
   - **Formspree Mapping**: Direct form submissions route patient requests, symptom declarations, and telemetry to the central clinic triage inbox instantly without maintaining active mail-server protocols.
   - **Prescription Ledger**: A historical timeline with instant downloadable access to digital homeopathic prescriptions.

2. **Practitioner Control Panel & Multi-Doctor Engine**
   - **Independent Tenant Subscriptions**: Doctor onboarding flow linked with state council board registration verification (BHMS/MD credentials require mandatory license key capture).
   - **Homeopathy Digital Engine**: Built-in homeopathic compounding and Materia Medica prescription interface allowing practitioners to match patient complaints to specific mother tinctures (Q), dilutions (6C, 30C, 200C, 1M), and bio-chemic tissue remedies.
   - **Revenue Dashboard**: Tracks consultation fees, platform commission shares, and Razorpay transaction settlements.

3. **Report Analyser Module (AI Diagnostics Gateway)**
   - **Document Dropzone**: Highly responsive touch-friendly drag-and-drop or photo-upload portal optimized for scanning healthcare blood panels, radiology reports, and thyroid markers via mobile cameras.
   - **Consent Layer**: Non-bypassable, interactive Telemedicine Practice Guidelines check-gate. Patients must confirm explicit consent before upload.
   - **Gemini Clinical Summary**: Real-time server-side OCR and clinical mapping highlighting outliers, reference range deviations, and homeopathic correlations (e.g., suggesting kidney-centric symptoms if creatinine is loaded) directly highlighting abnormal values in bold red.

4. **Daily Marketing Assets & Dynamic Poster Section**
   - **Visual Grid**: Responsive masonry/bento layout showing the daily collection of operational promotional posters (~10 posters per day).
   - **Direct Sharing Integration**: Dynamic Web Share API integrations allowing quick-dispersal distribution via WhatsApp, Telegram, or Instagram directly from are doctor's mobile device, improving local patient acquisition.

---

## 2. TECHNICAL REQUIREMENT DOCUMENT (TRD)

### Production-Ready Tech Stack

```
                     ┌─────────────────────────────┐
                     │    Single-Page Web App      │
                     │   (React + Vite + Tailwind) │
                     └──────────────┬──────────────┘
                                    │
                         Requests   │  Secured Proxies
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
    ┌──────────────────────┐                ┌──────────────────────┐
    │     Node.js CMS      │                │   Formspree Gateway  │
    │   (Express Server)   │                │ Web Form Auto-Routes │
    └───────────┬──────────┘                └───────────┬──────────┘
                │                                       │
      ┌─────────┴─────────┐                             │
      ▼                   ▼                             ▼
┌───────────┐       ┌───────────┐             ┌────────────────────┐
│  Firebase │       │  Gemini   │             │ Physician's Email  │
│ Firestore │       │ Flash-1.5 │             │   & WhatsApp Ino   │
└───────────┘       └───────────┘             └────────────────────┘
```

- **Runtime Target**: Node.js v18 LTS on PaaS Web Service (Render/Railway).
- **Frontend Architecture**: React 18 SPA built with Vite for optimal rendering and resource-constrained storage. All styling executes via utility class compilation (Tailwind CSS) ensuring 100% responsive fluid viewports for mobile admin screens.
- **Backend Architecture**: Express.js server functioning as both static bundle distributor and secured proxy gateway for sensitive client interactions.
- **Database Architecture**: Firebase Firestore + Admin SDK. Schema is structurally mapped for high parallelization.
- **Form-Routing Middleware**: Formspree API IDs handle critical patient triage. Eliminates backend email template management.
- **AI Core (OCR & Clinical Mapping)**: Secure Google Gemini Pro & Flash (via Node-side `@google/genai` wrapper) executing Vision models to perform medical OCR. Keys remain securely bound to server environment variables, totally protected from user browsers.
- **Payment & Communications**: Integrated Razorpay API Webhooks for payments & WhatsApp Web / Twilio / UltraMsg APIs for direct message dispatching.

---

## 3. APP FLOWS & CLINICAL USER JOURNEYS

### Journey A: Patient Diagnostic Handoff

```
[Patient enters portal via Mobile]
               │
               ▼
   [Consent Banner & Disclaimer Verification]
               │
               ✔ Agreed
               ▼
   [Mobile Upload: Blood/Lab Report Photo]
               │
               ▼
   [Express API Keyed Gemini Vision Call]
               │
               ▼
┌──────────────────────────────────────────────┐
│  Gemini processes OCR & identifies Outliers: │
│  - Red markers indicating metrics out-of-range│
│  - Suggests Homeopathic Materia Medica ties │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
    [Dynamic Link Generation matching parameters]
                       │
                       ▼
   [Direct WhatsApp Contact Hand-Off to Doctor]
```

### Journey B: Practitioner Tenancy Subscription

```
[Onboarding Page] ──► [Select Tier: Monthly/Annual]
                             │
                             ▼
                 [Verification Form: NCH / State]
                             │
                             ▼
                 [Razorpay Subscription Check]
                             │
                  Successful │
                             ▼
         [Activate Account & Grant Access to Dashboard]
```

### Journey C: Triage & Electronic Medical Records (EMR)
1. **Login**: Clinician logs in via WhatsApp OTP using a mobile browser.
2. **Review**: Clinician opens "Tele-Consultation Console", selects today's active queues, and reviews patient-asserted symptoms or Gemini-extracted blood work profiles.
3. **Dispatch**: One-click dispatch triggers WhatsApp invitation linking clinical video conference rooms (Jitsi/Secure WebRTC rooms).
4. **Prescription Form**: Doctor edits dynamically generated active therapeutic ledger, chooses homeopathic dilutions, and hits "Save & Close Audit Trail".

---

## 4. UI/UX DESIGN BRIEF & CONSTANTS

### Color Theme
Designed around natural holistic therapies, safety, and operational accessibility:
- **Primary Teal/Deep Green**: `bg-teal-900` (`#0f3a38`) & `bg-emerald-800` (`#064e3b`) for authoritative, healing-oriented, and clinical layouts.
- **Accents**: `bg-emerald-50` & `text-emerald-700` for active indicators and tags.
- **Disclaimers**: High-contrast Warning Crimson (`text-rose-600`) and Warm Amber (`bg-amber-500`) to highlight compliance, licensing declarations, and telemedicine practice legal guidelines.

### UX Rules for Mobile Founders
- **No Small Touch Zones**: Button heights are standard 48px to 54px (`py-3` to `py-4`) for reliable touch interactions.
- **Responsive Lists**: Desktop bento grids automatically collapse to single column rows (`lg:grid-cols-3 grid-cols-1`) with sticky navigation drawers in patient interfaces.
- **Immediate Skeletal States**: Multi-step forms (e.g. Clinic Onboarding) feature progressive progress bars, keeping non-coders grounded.

---

## 5. BACKEND DATABASE SCHEMA (LEGACY COMPATIBLE)

Below is the document schema configured for Firebase Firestore. You can monitor, add, or query these entries directly using the Firebase Web Console on your smartphone.

### `users` Collection
Tracks authentication records, roles, subscription tier, and onboarding statuses.
```json
{
  "uid": "usr_7x29q0p1b",
  "email": "dr.patil@kayrashomeo.com",
  "phone": "919876543210",
  "role": "doctor",
  "name": "Dr. Shreyas Patil",
  "specialization": "Pediatric Homeopathy, Organon of Medicine",
  "qualification": "BHMS, MD (Homeopathy)",
  "stateBoardRegistrationNumber": "MCI-HOM-10492",
  "nchRegistrationNumber": "NCH-99238-IN",
  "clinicId": "clin_kayra_pune",
  "clinicName": "Kayra's Pune Eastern Wing",
  "isOnboarded": true,
  "isVerified": true,
  "plan": "premium_annual",
  "createdAt": "2026-05-30T18:52:57Z"
}
```

### `appointments` Collection
Collects incoming form submissions and hooks patient requests.
```json
{
  "id": "appt_92k4n1x",
  "patientName": "Aarav Sharma",
  "patientId": "pat_93u1x99b",
  "doctorId": "usr_7x29q0p1b",
  "doctorName": "Dr. Shreyas Patil",
  "date": "2026-06-01",
  "time": "11:30 AM",
  "type": "Online",
  "status": "Scheduled",
  "reason": "Chronic Migraine, allergic rhinitis exacerbation",
  "phone": "917722994411",
  "fee": 500,
  "videoLink": "https://meet.jit.si/KayrasHomeoCare-AaravSharma-appt_92k4n1x",
  "createdAt": "2026-05-30T18:55:00Z"
}
```

### `medical_reports` Collection
Stores metadata for processing files, consent logs, and extracted OCR records coupled with remedial suggestions.
```json
{
  "id": "rep_39v02919x",
  "patientUid": "pat_93u1x99b",
  "patientName": "Aarav Sharma",
  "doctorId": "usr_7x29q0p1b",
  "uploadedBy": "patient",
  "fileUrl": "https://firebasestorage.googleapis.com/.../reports/aarav_blood_pdf",
  "telemedicineConsent": {
    "hasConsented": true,
    "consentTimestamp": "2026-05-30T18:54:10Z",
    "ipAddress": "192.168.1.18"
  },
  "ocrAnalysis": {
    "extractedText": "Hemoglobin: 11.2 g/dL (Below Range). TSH: 5.6 uIU/mL (Elevated).",
    "criticallyAbnormal": [
      {
        "metric": "Hemoglobin",
        "value": "11.2 g/dL",
        "referenceRange": "13.5 - 17.5 g/dL",
        "impact": "Mild Anemia"
      },
      {
        "metric": "TSH",
        "value": "5.6 uIU/mL",
        "referenceRange": "0.4 - 4.0 uIU/mL",
        "impact": "Mild Hypothyroidism"
      }
    ],
    "homeopathicSuggestions": {
      "remediesToEvaluate": ["Ferrum Phosphoricum 30C", "Calcarea Carbonica 200C", "Thyroidinum 3X"],
      "clinicalObservationGuide": "Evaluate patients for fatigue, cold extremities, and weight gain. Cross-reference clinical indications as per Kent's Repertory."
    }
  },
  "processedAt": "2026-05-30T18:54:40Z"
}
```

---

## 6. MOBILE-FIRST 6-WEEK DEPLOYMENT & PIPELINE PLAN

This highly direct execution roadmap details how you, the clinic founder, can move from code to a live medical application directly through your mobile browser!

### Step-by-Step GitHub to Render/Railway CI/CD Workflow (Mobile Browser Optimized)

You do not need a computer or a black command-line terminal to push code updates. Here is the operational process:

#### Phase A: Connect Repository to Host
1. **Prerequisite**: Save this code to your personal GitHub Account. You can create a GitHub repository on your mobile phone screen instantly by logging in and clicking the **New Repository** button directly on `github.com`.
2. **Access Deployment Platform**: Go to `render.com` or `railway.app` on Safari/Chrome on your phone.
3. **SSO Identity Claim**: Authenticate by logging in with your **GitHub Profile**. Render will immediately pair search permission to your repositories.
4. **Select Repository**: Select `kayra-homeo-care` from your remote repo list and click **Deploy**.

#### Phase B: Configure Build Environment Parameters
Beneath the Deployment Settings inside your Render container control screen, fill in fields under the **Environment Variables (Secrets)** sub-tab:
- Set `NODE_ENV` as `production`.
- Keep Web Service port configuration auto-routed (Express default will bind cleanly).
- Add the secret keys obtained from your external gateways:
  * `GEMINI_API_KEY`: *(For Report Analyser module intelligence)*
  * `WHATSAPP_PROVIDER`: `simulated` *(Change to `meta`, `ultramsg` or `twilio` once business account API numbers are active)*
  * `WHATSAPP_TOKEN`: `YOUR_SECRET_API_KEY`
  * `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: *(For consultation and monthly doctor subscriptions processing)*

#### Phase C: Set Deploy Build Run triggers
- **Build Command**: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
- **Start Command**: `node dist/server.cjs`

Once saved, Render/Railway triggers your automated HTTPS deployment sequence immediately. Every time an update is pushed to your GitHub main branch, the deploy pipeline is automatically activated and distributes live, updated modules contextually.

### 6-Week Phased Launch Timeline

| Week Period | Focus Domain | Key Milestones and Operational Output |
| :--- | :--- | :--- |
| **Week 1** | Code Repository & Platform Setup | Connect repository context, authenticate Firebase sandbox databases, map test endpoints. |
| **Week 2** | User Core Authentication & Onboarding | Activate doctor identity registry, implement license validation checks, implement mobile WhatsApp OTP access. |
| **Week 3** | Consent Capture & File Dropzone | Finalize Report Analyser drag-and-drop file systems, hook consent modals to DB security validations. |
| **Week 4** | Gemini AI Evaluation Integration | Connect Gemini Flash vision triggers to extract diagnostic details, compile homeopathic indexes. |
| **Week 5** | Multi-Doctor Market Setup | Connect Subscription pricing modules, bind Razorpay key-pairs dynamically for independent practitioners. |
| **Week 6** | E2E Mobile Testing & Release | Execute end-to-end user flows, evaluate form routing, lock environment variables, publish final production domain. |

---

*This Master Deployment Blueprint can be accessed, read, and maintained natively under the root of your code repository.*
