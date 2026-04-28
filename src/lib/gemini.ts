import { GoogleGenAI, Type } from "@google/genai";
import { fileToGenerativePart } from "./utils";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExamResult {
  score: number;
  totalPoints: number;
  feedback: string;
  questionBreakdown: { question: string; score: number; maxScore: number; feedback: string }[];
}

export const gradeExam = async (
  answerKeyFiles: File[],
  rubricText: string,
  studentFiles: File[],
  lang: string
): Promise<ExamResult> => {
  const model = "gemini-3.1-pro-preview"; // Best for complex reasoning and OCR

  const parts: any[] = [];
  
  parts.push({
    text: `You are an expert teacher grading a student's exam.`
  });

  if (rubricText) {
    parts.push({
      text: `Here is the grading rubric and criteria to follow strictly:\n${rubricText}`
    });
  }

  if (answerKeyFiles.length > 0) {
    parts.push({
      text: `Here is the answer key / official rubric documents:`
    });
    for (const file of answerKeyFiles) {
      parts.push(await fileToGenerativePart(file));
    }
  }

  parts.push({
    text: `Here are the pages of the student's exam submission. Carefully read the handwritten or printed text. Grade the exam based ONLY on the provided answer key and rubric. For written expressions/essays, strictly follow the provided rubric criteria for points. Give specific feedback per question, and be encouraging but objective. Output the response in JSON format. Use ${lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English'} for all feedback and text fields.`
  });

  for (const file of studentFiles) {
    parts.push(await fileToGenerativePart(file));
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER, description: "Total score achieved by the student" },
      totalPoints: { type: Type.NUMBER, description: "Maximum possible score based on the rubric" },
      feedback: { type: Type.STRING, description: "General overall feedback for the student" },
      questionBreakdown: {
        type: Type.ARRAY,
        description: "Breakdown of scores and feedback for each question or section",
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "The question number or section name" },
            score: { type: Type.NUMBER, description: "Score given for this question" },
            maxScore: { type: Type.NUMBER, description: "Maximum possible score for this question" },
            feedback: { type: Type.STRING, description: "Specific feedback explaining the grade for this question. If points were deducted, explain why." }
          },
          required: ["question", "score", "maxScore", "feedback"]
        }
      }
    },
    required: ["score", "totalPoints", "feedback", "questionBreakdown"]
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1, // Low temperature for more objective and deterministic grading
      }
    });

    const jsonStr = response.text?.trim() || "";
    const result = JSON.parse(jsonStr) as ExamResult;
    return result;
  } catch (error) {
    console.error("Grading error:", error);
    throw error;
  }
};
