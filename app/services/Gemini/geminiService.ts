import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyAtM47YuD47DG9oBtZtnPRazvbmG9G4d40");

interface generateContentProps {
  prompt: string;
}
export const generateContent = async ({ prompt }: generateContentProps) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};
