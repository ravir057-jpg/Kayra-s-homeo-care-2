import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRepertoryInsights(symptoms: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are a Master Homeopathic Repertory Analyst. 
        Perform a thorough AI Diagnosis based on the following symptoms.
        
        Mandatory Clinical Directives:
        1. **Cross-Analyze Kent's Repertory**: Identify the primary rubrics for each symptom from J.T. Kent's Repertory of Homoeopathic Materia Medica. Use his specific grading system (BOLD/Italic/Roman).
        2. **Cross-Analyze William Boericke's Repertory**: Reference clinical rubrics and indications from Boericke's Pocket Manual of Homoeopathic Materia Medica.
        3. **Remedy Indications**: Suggest potential homeopathic remedies based on the totality of symptoms. Rank them by degree of indication.
        4. **Miasmatic Diagnosis**: Assess whether the symptoms point towards a Psoric, Sycotic, Syphilitic, or Tubercular miasm.
        5. **Differential Analysis**: Provide key points to distinguish between the top 3 remedies suggested.
        
        Symptoms: ${symptoms}
        
        Format the output in a professional, world-class Markdown structure with sections for Rubrics, Remedy Analysis, and Clinical Strategy.
      `,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    // Check for grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingText = response.text || "No insights generated.";
    
    return groundingText;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to fetch AI insights. Please try again.";
  }
}

export async function getAdvancedRepertoryAnalysis(symptoms: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are an advanced Homeopathic AI Diagnostic Engine. 
        Perform a comprehensive repertory and miasmatic analysis of the following totality.
        
        Clinical Requirements:
        1. **Rubric Selection**: Identify the exact rubrics from Kent, Boericke, and Synthesis repertories.
        2. **Mathematical Repertorization**: Simulate a repertorial chart showing degrees (3, 2, 1) for top 5 remedies.
        3. **Remedy Comparison**: Provide a table comparing the top remedies against the presenting modalities.
        4. **Clinical Suggestion**: Suggest a starting potency (e.g., 30C vs 1M) based on the disease depth (Acute/Chronic/Acute-on-Chronic).
        
        Symptoms: ${symptoms}
        
        Return in a highly professional Markdown format suitable for a clinical consultant's review.
      `,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to perform advanced analysis. Please try again.";
  }
}

export async function analyzeCase(caseDetails: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are a world-class professional homeopathic case analyst and consultant. 
        Review the following clinical case notes and provide a deep therapeutic analysis.
        
        Mandatory Clinical Insights:
        1. **Symptom Totality**: Synthesize all physical, mental, and general symptoms into a cohesive totality.
        2. **Miasmatic Assessment**: Determine the underlying miasm (Psoric, Sycotic, Syphilitic, or Tubercular) with justification.
        3. **Indicated Remedies**: Suggest 3-5 homeopathic remedies with specific indices of indication from Master Materia Medicas (Kent, Boericke, Allen).
        4. **Therapeutic Strategy**: Provide a suggested potency (e.g., 30C, 200C, 1M) and repetition logic based on the patient's sensitivity and disease chronicity.
        5. **Prognosis & Obstacles**: Identify potential "Obstacles to Recovery" (e.g., diet, environment, suppressed symptoms).
        
        Case Details: ${caseDetails}
        
        Return in highly professional Markdown format with clear headings, bold summary points, and a structured, easy-to-read layout.
      `,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze case. Please try again.";
  }
}

export async function analyzeSpecificCase(patientContext: string, currentSymptom: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are an expert Homeopathic Consultant analyzing a specific patient case for a doctor.
        
        **Patient Clinical Context (Medical History & Profile):**
        ${patientContext}
        
        **Current Presenting Symptoms:**
        ${currentSymptom}
        
        **Your Task:**
        1. **Cross-Reference**: Compare current symptoms with historical patterns. Is this a recurrence of an old miasmatic layer or a new manifestation?
        2. **Rubric Identification**: Suggest the most critical rubrics for this specific totality.
        3. **Indicated Remedies**: Suggest top remedies, prioritizing those that cover both the current acute state and the chronic background (constitutional match).
        4. **Clinical Suggestion**: Provide a specific suggestion for the doctor, including potential potency and expected reaction (Hering's Law pointers).
        
        Return in a beautiful Markdown format with professional clinical tone. Use tables for remedy comparisons if helpful.
      `,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze case. Please try again.";
  }
}

export async function analyzeMedicalReport(reportData: { data: string; mimeType: string }, notes?: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            text: `
              You are a world-class specialized Medical Consultant and Clinical Diagnostic Expert. 
              Your role is to assist a homeopathic doctor in analyzing complex medical reports (Pathology, CBC, Scans, Radiology, etc.).
              
              ${notes ? `**Doctor's Specific Notes/Questions:**\n${notes}\n` : ''}

              **Analysis Requirements:**
              1. **Data Extraction**: Precisely extract all key findings, abnormal values (with their ranges), and pertinent negatives.
              2. **Clinical Significance**: Explain the physiological and clinical meaning of these findings. How do they relate to the patient's potential disease state?
              3. **Differential Diagnoses**:
                 - Provide a list of **Conventional Medical Differentials** based on the findings.
                 - Provide **Homeopathic Miasmatic Correlations** (Psoric, Sycotic, Syphilitic, or Tubercular manifestations).
              4. **Homeopathic Follow-up**: Based on the abnormalities found, recommend 5-7 specialized "Search for Totality" questions. These should help the doctor uncover refined modalities or mental/physical generals related to the findings.
              5. **Materia Medica Hints**: Suggest 3-5 homeopathic remedies that traditionally relate to the clinical pattern observed in the report (e.g., if liver enzymes are high, suggest remedies with liver affinities like Carduus m., Chelidonium, etc.).
              6. **Emergency Flags**: Clearly highlight any findings that require immediate conventional specialist consultation or emergency care.

              **Formatting Directives:**
              - Use a high-end, professional Markdown structure.
              - Use tables for numerical data comparison where possible.
              - Organize the output into these distinct sections:
                - ## I. Executive Summary of Findings
                - ## II. Detailed Analysis of Abnormalities
                - ## III. Clinical & Pathological Significance
                - ## IV. Differential Diagnoses (Conventional & Homeopathic)
                - ## V. Homeopathic Case-Taking: Follow-up Questions
                - ## VI. Repertorial & Materia Medica Hints
                - ## VII. Clinical Recommendations & Urgency Status
            `,
          },
          {
            inlineData: reportData
          }
        ]
      }
    });

    return response.text || "Could not analyze the report.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze the medical report. Ensure the file is clear and readable.";
  }
}

export async function searchMateriaMedica(query: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are a profound scholar of Homeopathic Materia Medica. 
        Search and summarize details for the requested remedy or condition.
        
        Mandatory Source Texts:
        1. H.C. Allen's Keynotes and Characteristics
        2. S.R. Phatak's Materia Medica of Homoeopathic Medicines
        3. E.B. Nash's Leaders in Homoeopathic Therapeutics
        4. J.H. Clarke's Dictionary of Practical Materia Medica
        5. William Boericke's Pocket Manual of Homoeopathic Materia Medica
        6. J.T. Kent's Lectures on Homoeopathic Materia Medica
        
        Requirements:
        - Summarize the "Guiding Symptoms" and "Keynotes" from the specific masters mentioned.
        - Highlight "Red Strand" symptoms.
        - Provide relationships (complementary, inimical, antidotes) as described in these texts.
        
        Query: ${query}
        
        Return in Markdown format with professional clinical formatting.
      `,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "No Materia Medica data found.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to search Materia Medica. Please try again.";
  }
}
