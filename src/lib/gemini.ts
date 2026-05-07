import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL_NAME = "gemini-1.5-flash";

export async function getRepertoryInsights(symptoms: string) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(`Analyze these symptoms from a homeopathic perspective: ${symptoms}`);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to fetch AI insights. Please try again.";
  }
}

export async function getAdvancedRepertoryAnalysis(symptoms: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: `
          You are an advanced Homeopathic AI Diagnostic Engine. 
          Perform a comprehensive repertory and miasmatic analysis of the provided symptom totality.
          
          Clinical Requirements:
          1. **Rubric Selection**: Identify the exact rubrics from Kent, Boericke, and Synthesis repertories.
          2. **Mathematical Repertorization**: Simulate a repertorial chart showing degrees (3, 2, 1) for top 5 remedies.
          3. **Remedy Comparison**: Provide a table comparing the top remedies against the presenting modalities.
          4. **Clinical Suggestion**: Suggest a starting potency based on the disease depth (Acute/Chronic).
          
          Return in professional Markdown suitable for a clinical consultant's review.
        `
    });
    const result = await model.generateContent(`Symptoms: ${symptoms}`);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to perform advanced analysis. Please try again.";
  }
}

export async function analyzeCase(caseDetails: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: `
          You are a world-class professional homeopathic case analyst and consultant. 
          Review the clinical case notes provided and provide a deep therapeutic analysis.
          
          Mandatory Clinical Insights:
          1. **Symptom Totality**: Synthesize all physical, mental, and general symptoms.
          2. **Miasmatic Assessment**: Determine the underlying miasm (Psoric, Sycotic, Syphilitic, or Tubercular) with justification.
          3. **Indicated Remedies**: Suggest 3-5 homeopathic remedies with specific indices of indication from Master Materia Medicas (Kent, Boericke, Allen).
          4. **Therapeutic Strategy**: Provide a suggested potency and repetition logic.
          5. **Prognosis & Obstacles**: Identify potential "Obstacles to Recovery".
          
          Return in professional Markdown with clear headings and a structured layout.
        `
    });
    const result = await model.generateContent(`Case Details: ${caseDetails}`);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze case. Please try again.";
  }
}

export async function analyzeSpecificCase(patientContext: string, currentSymptom: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: `
          You are an expert Homeopathic Consultant analyzing a specific patient case for a doctor.
          
          **Your Task:**
          1. **Cross-Reference**: Compare current symptoms with historical patterns.
          2. **Rubric Identification**: Suggest the most critical rubrics for this specific totality.
          3. **Indicated Remedies**: Suggest top remedies covering both current and chronic states.
          4. **Clinical Suggestion**: Provide suggestions for potency and expected reactions.
          
          Return in a beautiful Markdown format with professional clinical tone.
        `
    });
    const result = await model.generateContent(`
        **Patient Clinical Context:**
        ${patientContext}
        
        **Current Presenting Symptoms:**
        ${currentSymptom}
      `);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze case. Please try again.";
  }
}

export async function analyzeMedicalReport(reportData: { data: string; mimeType: string }, notes?: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: `
          You are a world-class specialized Medical Consultant and Clinical Diagnostic Expert. 
          Your role is to assist a homeopathic doctor in analyzing complex medical reports.
          
          **Analysis Requirements:**
          1. **Data Extraction**: Precisely extract all key findings and abnormal values.
          2. **Clinical Significance**: Explain the physiological and clinical meaning of these findings.
          3. **Differential Diagnoses**: Provide Conventional Medical Differentials and Homeopathic Miasmatic Correlations.
          4. **Homeopathic Follow-up**: Recommend 5-7 specialized "Search for Totality" questions.
          5. **Materia Medica Hints**: Suggest 3-5 homeopathic remedies traditionally related to the findings.
          6. **Emergency Flags**: Highlight any findings that require urgent conventional medical intervention.
        `
    });
    const result = await model.generateContent([
      { inlineData: reportData },
      { text: notes ? `**Doctor's Notes:**\n${notes}` : "Please analyze this medical report." }
    ]);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze the medical report. Ensure the file is clear and readable.";
  }
}

export async function searchMateriaMedica(query: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: `
          You are a profound scholar of Homeopathic Materia Medica. 
          Search and summarize details for the requested remedy or condition based on Master Texts (Allen, Phatak, Nash, Clarke, Boericke, Kent).
          
          Requirements:
          - Summarize the "Guiding Symptoms" and "Keynotes".
          - Highlight "Red Strand" symptoms.
          - Provide relationships (complementary, inimical, antidotes).
          
          Return in Markdown format with professional clinical formatting.
        `
    });
    const result = await model.generateContent(`Query: ${query}`);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to search Materia Medica. Please try again.";
  }
}
