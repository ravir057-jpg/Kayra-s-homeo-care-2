// Client proxy to delegate all Gemini calls to secured server-side routes
// Exposes the exact same interface to ensure backward compatibility and protect keys.

async function handleServerAiCall(route: string, bodyObj: any, fallbackText: string): Promise<string> {
  try {
    const response = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj)
    });
    if (!response.ok) {
      throw new Error(`AI Route failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.text || fallbackText;
  } catch (error) {
    console.error(`Error during proxy AI call to ${route}:`, error);
    return fallbackText;
  }
}

export async function getRepertoryInsights(symptoms: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/repertory-insights",
    { symptoms, extra },
    "Failed to fetch AI insights. Please check connection and try again."
  );
}

export async function getAdvancedRepertoryAnalysis(symptoms: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/advanced-repertory-analysis",
    { symptoms, extra },
    "Failed to perform advanced analysis. Please try again."
  );
}

export async function analyzeCase(caseDetails: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/analyze-case",
    { caseDetails, extra },
    "Failed to analyze case. Please try again."
  );
}

export async function analyzeSpecificCase(patientContext: string, currentSymptom: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/analyze-specific-case",
    { patientContext, currentSymptom, extra },
    "Failed to analyze specific case. Please try again."
  );
}

export async function analyzeMedicalReport(reportData: { data: string; mimeType: string }, notes?: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/analyze-medical-report",
    { reportData, notes, extra },
    "Failed to analyze the medical report. Ensure the file is clear and readable."
  );
}

export async function searchMateriaMedica(query: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/search-materia-medica",
    { query, extra },
    "Failed to search Materia Medica. Please try again."
  );
}

export async function synthesizeSymptomAndLabReport(glassAiOutput: string, patientSymptoms: string, extra?: string): Promise<string> {
  return handleServerAiCall(
    "/api/ai/synthesize-symptom-and-lab-report",
    { glassAiOutput, patientSymptoms, extra },
    "Failed to synthesize case. Please try again."
  );
}
