export interface AnalysisResult {
  summary: string;
  observations: string[];
  findings: { parameter: string; value: string; result: 'Normal' | 'Abnormal'; reference: string }[];
  clinicalGuidance: string;
  rubricsSuggested: string[];
  ambossVerified?: string;
  glassInsights?: string;
  homeopathicMatches?: string;
  synthesisRubrics?: {
    rubricName: string;
    repertoryChapter: string;
    sourceAbnormalFinding: string;
    remediesAssociated: { remedy: string; grade: number }[];
  }[];
}

export const ReportAnalyzerService = {
  analyzeReport: async (imageUrl: string, category: string): Promise<AnalysisResult> => {
    try {
      const response = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, category }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      console.error("Error analyzing report via server:", err);
      // Construct a highly descriptive, robust fallback to prevent UI crash
      return {
        summary: "AI analysis was unable to complete successfully due to report format or connection issue.",
        observations: [
          "Could not analyze report details automatically.",
          "Please verify that the document is clear and readable."
        ],
        findings: [
          { parameter: "Diagnostic Handoff", value: "Pending Verification", result: "Normal", reference: "Manual review recommended" }
        ],
        clinicalGuidance: "Please manually review the patient's medical history, blood parameters, or scanned films directly to configure the similimum plan.",
        rubricsSuggested: ["Clinical consultation; repertorization required"],
        ambossVerified: "Standard verification is pending. Please verify abnormal findings against reference clinical guidelines.",
        glassInsights: "Gemini clinical entity assessment pending. Review differential diagnosis indicators manually.",
        homeopathicMatches: "Reviewing Materia Medica and classical repertories for symptom indicators... Dynamic match pending.",
        synthesisRubrics: [
          {
            rubricName: "GENERALITIES; constitutional analysis required",
            repertoryChapter: "GENERALITIES",
            sourceAbnormalFinding: "Overall physiological review",
            remediesAssociated: [
              { remedy: "Sulphur", grade: 3 },
              { remedy: "Thuja Occidentalis", grade: 3 },
              { remedy: "Lycopodium Clavatum", grade: 3 }
            ]
          } as any
        ]
      };
    }
  }
};
