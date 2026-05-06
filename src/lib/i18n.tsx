import { useState, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';

type Language = 'en' | 'hi' | 'mr' | 'bn' | 'te';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
    bn: string;
    te: string;
  };
}

const translations: Translations = {
  // Navigation
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड', mr: 'डॅशबोर्ड', bn: 'ড্যাশবোর্ড', te: 'డాష్‌బోర్డ్' },
  patients: { en: 'Patients', hi: 'मरीज़', mr: 'रुग्ण', bn: 'রোগী', te: 'రోగులు' },
  appointments: { en: 'Appointments', hi: 'अपॉइंटमेंट', mr: 'अपॉइंटमेंट', bn: 'অ্যাপয়েন্টমেন্ট', te: 'అపాయింట్‌మెంట్‌లు' },
  prescription: { en: 'Prescription', hi: 'पर्चा', mr: 'प्रिस्क्रिप्शन', bn: 'প্রেসক্রিপশন', te: 'ప్రిస్క్రిప్షన్' },
  inventory: { en: 'Inventory', hi: 'स्टॉक', mr: 'साठा', bn: 'ইনভেন্টরি', te: 'ఇన్వెంటరీ' },
  billing: { en: 'Billing', hi: 'बिलिंग', mr: 'बिलिंग', bn: 'বিলিং', te: 'బిల్లింగ్' },
  doctors: { en: 'Doctors', hi: 'डॉक्टर्स', mr: 'डॉक्टर', bn: 'ডাক্তার', te: 'వైద్యులు' },
  settings: { en: 'Settings', hi: 'सेटिंग्स', mr: 'सेटिंग्ज', bn: 'সেটিংস', te: 'సెట్టింగ్‌లు' },
  reports: { en: 'Reports', hi: 'रिपोर्ट्स', mr: 'अहवाल', bn: 'রিপোর্ট', te: 'నివేదికలు' },
  logout: { en: 'Logout', hi: 'लॉगआउट', mr: 'लॉगआउट', bn: 'লগআউট', te: 'లాగౌట్' },
  follow_ups: { en: 'Follow-ups', hi: 'फॉलो-अप', mr: 'फॉलो-अप', bn: 'ফলো-আপ', te: 'ఫాలో-అప్‌లు' },
  video_consult: { en: 'Video Consult', hi: 'वीडियो परामर्श', mr: 'व्हिडिओ सल्ला', bn: 'ভিডিও পরামর্শ', te: 'వీడియో సంప్రదింపులు' },
  
  // Dashboard
  total_patients: { en: 'Total Patients', hi: 'कुल मरीज़', mr: 'एकूण रुग्ण', bn: 'মোট রোগী', te: 'మొత్తం రోగులు' },
  revenue: { en: 'Revenue', hi: 'कुल आय', mr: 'महसूल', bn: 'রাজস্ব', te: 'రాబడి' },
  low_stock: { en: 'Low Stock', hi: 'कम स्टॉक', mr: 'कमी साठा', bn: 'কম স্টক', te: 'తక్కువ స్టాక్' },
  today: { en: 'Today', hi: 'आज', mr: 'आज', bn: 'আজ', te: 'ఈరోజు' },
  upcoming_consultations: { en: 'Upcoming Consultations', hi: 'आने वाले परामर्श', mr: 'येणारे सल्लामसलत', bn: 'আসন্ন পরামর্শ', te: 'రాబోయే సంప్రదింపులు' },
  recent_activity: { en: 'Recent Activity', hi: 'हाल की गतिविधि', mr: 'अलीकडील क्रियाकलाप', bn: 'সাম্প্রতিক কার্যকলাপ', te: 'ఇటీవలి కార్యాచరణ' },
  
  // Buttons & Labels
  book_appointment: { en: 'Book Appointment', hi: 'अपॉइंटमेंट बुक करें', mr: 'अपॉइंटमेंट बुक करा', bn: 'অ্যাপয়েন্টমেন্ট বুক করুন', te: 'అపాయింట్‌మెంట్ బుక్ చేయండి' },
  add_patient: { en: 'Add Patient', hi: 'मरीज़ जोड़ें', mr: 'रुग्ण जोडा', bn: 'রোগী যোগ করুন', te: 'రోగిని జోడించండి' },
  save: { en: 'Save', hi: 'सहेजें', mr: 'जतन करा', bn: 'সংরক্ষণ করুন', te: 'సేవ్ చేయండి' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', mr: 'रद्द करा', bn: 'বাতিল করুন', te: 'రద్దు చేయండి' },
  edit: { en: 'Edit', hi: 'बदलें', mr: 'संपादित करा', bn: 'সম্পাদনা করুন', te: 'సవరించండి' },
  delete: { en: 'Delete', hi: 'हटाएं', mr: 'हटवा', bn: 'ডিলিট করুন', te: 'తొలగించు' },
  share_whatsapp: { en: 'Share on WhatsApp', hi: 'व्हाट्सएप पर साझा करें', mr: 'व्हॉट्सअॅपवर शेअर करा', bn: 'হোয়াটসঅ্যাপে শেয়ার করুন', te: 'వాట్సాప్‌లో షేర్ చేయండి' },
  start_call: { en: 'Start Call', hi: 'कॉल शुरू करें', mr: 'कॉल सुरू करा', bn: 'কল শুরু করুন', te: 'కాల్ ప్రారంభించండి' },
  full_name: { en: 'Full Name', hi: 'पूरा नाम', mr: 'पूर्ण नाव', bn: 'পুরো নাম', te: 'పూర్తి పేరు' },
  phone_number: { en: 'Phone Number', hi: 'फ़ोन नंबर', mr: 'फोन नंबर', bn: 'ফোন নম্বর', te: 'ఫోన్ నంబర్' },
  email: { en: 'Email', hi: 'ईमेल', mr: 'ईमेल', bn: 'ইমেল', te: 'ఈమెయిల్' },
  dob: { en: 'Date of Birth', hi: 'जन्म तिथि', mr: 'जन्म तारीख', bn: 'জন্ম তারিখ', te: 'పుట్టిన తేదీ' },
  gender: { en: 'Gender', hi: 'लिंग', mr: 'लिंग', bn: 'লিঙ্গ', te: 'లింగం' },
  address: { en: 'Address', hi: 'पता', mr: 'पत्ता', bn: 'ঠিকানা', te: 'చిరునామా' },
  medical_history: { en: 'Medical History', hi: 'चिकित्सा इतिहास', mr: 'वैद्यकीय इतिहास', bn: 'চিকিৎসা ইতিহাস', te: 'వైద్య చరిత్ర' },
  save_patient: { en: 'Save Patient', hi: 'मरीज सहेजें', mr: 'रुग्ण जतन करा', bn: 'রোগী সংরক্ষণ করুন', te: 'రోగిని సేవ్ చేయండి' },
  update_patient: { en: 'Update Patient', hi: 'मरीज अपडेट करें', mr: 'रुग्ण अपडेट करा', bn: 'রোগী আপডেট করুন', te: 'రోగిని అప్‌డేట్ చేయండి' },
  optional: { en: 'Optional', hi: 'वैकल्पिक', mr: 'पर्यायी', bn: 'ঐচ্ছিক', te: 'ఐచ్ఛికం' },
  male: { en: 'Male', hi: 'पुरुष', mr: 'पुरुष', bn: 'পুরুষ', te: 'పురుషుడు' },
  female: { en: 'Female', hi: 'महिला', mr: 'स्त्री', bn: 'মহিলা', te: 'స్త్రీ' },
  other: { en: 'Other', hi: 'अन्य', mr: 'इतर', bn: 'অন্যান্য', te: 'ఇతర' },
  patient_profile: { en: 'Patient Profile', hi: 'मरीज प्रोफाइल', mr: 'रुग्ण प्रोफाइल', bn: 'রোগীর প্রোফাইল', te: 'రోగి ప్రొఫైల్' },
  contact: { en: 'Contact', hi: 'संपर्क', mr: 'संपर्क', bn: 'যোগাযোগ', te: 'సంప్రదించండి' },
  gender_age: { en: 'Gender/Age', hi: 'लिंग/आयु', mr: 'लिंग/वय', bn: 'লিঙ্গ/বয়স', te: 'లింగం/వయస్సు' },
  status: { en: 'Status', hi: 'स्थिति', mr: 'स्थिती', bn: 'স্থিতি', te: 'స్థితి' },
  actions: { en: 'Actions', hi: 'कार्य', mr: 'कृती', bn: 'অ্যাকশন', te: 'చర్యలు' },
  finalize_appointment: { en: 'Finalize Appointment', hi: 'अपॉइंटमेंट फाइनल करें', mr: 'अपॉइंटमेंट फायनल करा', bn: 'অ্যাপয়েন্টমেন্ট চূড়ান্ত করুন', te: 'అపాయింట్‌మెంట్‌ను ఖరారు చేయండి' },
  consultation_mode: { en: 'Consultation Mode', hi: 'परामर्श मोड', mr: 'सल्ला पद्धत', bn: 'পরামর্শ মোড', te: 'సంప్రదింపు మోడ్' },
  search_patients: { en: 'Search by Name, Phone or ID...', hi: 'नाम, फोन या आईडी से खोजें...', mr: 'नाव, फोन किंवा आयडी द्वारे शोधा...', bn: 'নাম, ফোন বা আইডি দিয়ে খুঁজুন...', te: 'పేరు, ఫోన్ లేదా ఐడి ద్వారా వెతకండి...' },
  
  // AI Tools
  diagnostics: { en: 'Diagnostics', hi: 'निदान', mr: 'निदान', bn: 'ডায়াগনস্টিকস', te: 'రోగ నిర్ధారణ' },
  report_analyzer: { en: 'Report Analyzer', hi: 'रिपोर्ट विश्लेषक', mr: 'अहवाल विश्लेषक', bn: 'রিপোর্ট বিশ্লেষক', te: 'నివేదిక విశ్లేషకుడు' },
  repertory: { en: 'Repertory', hi: 'रेपर्टरी', mr: 'रेपर्टरी', bn: 'রেপার্টরি', te: 'రెపర్టరీ' },
  case_study: { en: 'Case Study', hi: 'केस स्टडी', mr: 'केस स्टडी', bn: 'কেস স্টাডি', te: 'కేస్ స్టడీ' },
  materia_medica: { en: 'Materia Medica', hi: 'मटेरिया मेडिका', mr: 'मटेरिया मेडिका', bn: 'মেটেরিয়া মেডিকা', te: 'మెటీరియా మెడికా' },
  upload_report: { en: 'Upload Report or Scan', hi: 'रिपोर्ट या स्कैन अपलोड करें', mr: 'अहवाल किंवा स्कॅन अपलोड करा', bn: 'রিপোর্ট বা স্ক্যান আপলোড করুন', te: 'నివేదిక లేదా స్కాన్‌ను అప్‌లోడ్ చేయండి' },
  analyze_report: { en: 'Analyze Medical Report', hi: 'मेडिकल रिपोर्ट का विश्लेषण करें', mr: 'वैद्यकीय अहवालाचे विश्लेषण करा', bn: 'ডিজিটাল মেডিকেল রিপোর্ট বিশ্লেষণ করুন', te: 'వైద్య నివేదికను విశ్లేషించండి' },
  consult_ai: { en: 'Consult Gemini AI', hi: 'जेमिनी एआई से परामर्श करें', mr: 'जेमिनी एआयचा सल्ला घ्या', bn: 'জেমিইনি এআই এর সাথে পরামর্শ করুন', te: 'జెమిని AIని సంప్రదించండి' },
  ai_insights: { en: 'AI Insights', hi: 'एआई अंतर्दृष्टि', mr: 'एआय अंतर्दृष्टी', bn: 'এআই অন্তর্দৃষ্টি', te: 'AI అంతర్దృష్టులు' },

  subscription: { en: 'Subscription', hi: 'सदस्यता', mr: 'सदस्यता', bn: 'সাবস্ক্রিপশন', te: 'సభ్యత్వం' },
  active_plan: { en: 'Active Plan', hi: 'सक्रिय योजना', mr: 'सक्रिय योजना', bn: 'সক্রিয় প্ল্যান', te: 'క్రియాశీల ప్లాన్' },
  renew_now: { en: 'Renew Now', hi: 'अभी नवीनीकृत करें', mr: 'आता नूतनीकरण करा', bn: 'এখন রিনিউ করুন', te: 'ఇప్పుడే పునరుద్ధరించండి' },
  patient_fees: { en: 'Patient Fees', hi: 'मरीजों की फीस', mr: 'रुग्ण फी', bn: 'রোগীর ফি', te: 'రోగి ఫీజు' },
  platform_subscription: { en: 'Platform Subscription', hi: 'प्लेटफॉर्म सदस्यता', mr: 'प्लॅटफॉर्म सदस्यता', bn: 'প্ল্যাটফর্ম সাবস্ক্রিপশন', te: 'ప్లాట్‌ఫారమ్ సభ్యత్వం' },
  pay_fee: { en: 'Pay Consultation Fee', hi: 'परामर्श शुल्क का भुगतान करें', mr: 'सल्ला शुल्क भरा', bn: 'পরামর্শ ফি প্রদান করুন', te: 'సంప్రదింపు రుసుము చెల్లించండి' },
  online: { en: 'Online', hi: 'ऑनलाइन', mr: 'ऑनलाइन', bn: 'অনলাইন', te: 'ఆన్‌లైన్' },
  offline: { en: 'In-Clinic', hi: 'क्लिनिक में', mr: 'क्लिनिकमध्ये', bn: 'ইন-ক্লিনিক', te: 'ఇన్-క్లినిక్' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string) => {
    return translations[key]?.[language] || key;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
