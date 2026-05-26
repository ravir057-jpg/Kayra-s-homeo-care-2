import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  summary: string;
  observations: string[];
  findings: { parameter: string; value: string; result: 'Normal' | 'Abnormal'; reference: string }[];
  clinicalGuidance: string;
  rubricsSuggested: string[];
}

export const ReportAnalyzerService = {
  analyzeReport: async (imageUrl: string, category: string): Promise<AnalysisResult> => {
    // Convert URL to base64 if it's already a data URL, otherwise we'd need to fetch it
    // In this applet environment, medical reports are likely stored as URLs in Firebase Storage.
    // We'll assume the URL is accessible or we fetch it and convert to base64.
    
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      base64Data = parts[1];
      mimeType = parts[0].split(':')[1].split(';')[0];
    } else {
      // Fetch and convert to base64
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        mimeType = blob.type;
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onloadend = () => {
             const base64String = (reader.result as string).split(',')[1];
             resolve(base64String);
          };
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error("Error fetching report for analysis:", err);
        throw new Error("Could not fetch the report image for AI analysis.");
      }
    }

    const prompt = `
      You are a Lead Medical AI Architect for Kayra's Homeo Care. 
      Analyze this medical report (Category: ${category}).
      
      1. Extract all clinical parameters and their values.
      2. Identify values outside the reference range (mark as Abnormal).
      3. Provide a concise clinical summary from a homeopathic perspective.
      4. Suggest relevant homeopathic rubrics or areas of clinical inquiry based on the abnormalities (Materia Medica integration).
      5. Highlight specific "Doctor's Guidance" for the physician.
      
      Return the results in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            observations: { type: Type.ARRAY, items: { type: Type.STRING } },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  parameter: { type: Type.STRING },
                  value: { type: Type.STRING },
                  result: { type: Type.STRING, enum: ["Normal", "Abnormal"] },
                  reference: { type: Type.STRING }
                },
                required: ["parameter", "value", "result"]
              }
            },
            clinicalGuidance: { type: Type.STRING },
            rubricsSuggested: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "observations", "findings", "clinicalGuidance", "rubricsSuggested"]
        }
      }
    });

    try {
      const result = JSON.parse(response.text);
      return result;
    } catch (err) {
      console.error("Error parsing AI response:", err);
      throw new Error("Failed to parse AI diagnostic output.");
    }
  }
};
