const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
  } catch (error) {
    return "AI service unavailable. Please try again.";
  }
}

export async function getRepertoryInsights(symptoms: string) {
  return callGemini(`Homeopathic analysis for: ${symptoms}`);
}

export async function getAdvancedRepertoryAnalysis(symptoms: string) {
  return callGemini(`Advanced repertory analysis: ${symptoms}`);
}

export async function getMateriaMedicaInsights(remedy: string) {
  return callGemini(`Materia medica profile for: ${remedy}`);
}

export async function analyzeMedicalReport(base64: string, mime: string) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this medical report for a homeopathic doctor:" },
            { inline_data: { mime_type: mime, data: base64 }}
          ]
        }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis failed.";
  } catch {
    return "Failed to analyze. Please try again.";
  }
}

export async function getPrescriptionSuggestion(diagnosis: string, symptoms: string, age: string) {
  return callGemini(`Prescription for: ${diagnosis}, symptoms: ${symptoms}, age: ${age}`);
}
