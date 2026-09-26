import { generateAIContent } from "@/lib/ai/gemini";
import { parseAIJson } from "@/lib/ai/parser";
import { ResumeAnalysis } from "@/types/resume";
import { RESUME_ANALYSIS_PROMPT } from "./prompts";

class ResumeAnalysisService {
  async analyze(
    resumeText: string
  ): Promise<ResumeAnalysis> {
    try {
      const response = await generateAIContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
${RESUME_ANALYSIS_PROMPT}

Resume:

${resumeText}
                `,
              },
            ],
          },
        ],
      });

      const raw = response.text?.trim() ?? "";
      const parsed = parseAIJson<any>(raw);

      return {
        overallScore: typeof parsed.overallScore === "number" ? parsed.overallScore : 70,
        atsScore: typeof parsed.atsScore === "number" ? parsed.atsScore : 70,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        summary: parsed.summary || "Resume analysis completed.",
      };
    } catch (error: any) {
      console.error("Resume Analysis Error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to analyze resume."
      );
    }
  }
}

export default new ResumeAnalysisService();