import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyAtM47YuD47DG9oBtZtnPRazvbmG9G4d40");

interface GenerateContentProps {
  prompt: string;
  responseFormat?: "text" | "json";
}

export const generateContent = async ({
  prompt,
  responseFormat = "text",
}: GenerateContentProps) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // If JSON response is requested, modify the prompt to request JSON
    let enhancedPrompt = prompt;
    if (responseFormat === "json") {
      enhancedPrompt = `${prompt}\n\nProvide your response in valid JSON format only, with no additional text, explanations, or asterisks.`;
    }

    const result = await model.generateContent(enhancedPrompt);
    const responseText = result.response.text();

    // If JSON was requested, try to parse the response
    if (responseFormat === "json") {
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        console.log("Raw response:", responseText);
        throw new Error("Failed to parse JSON response from Gemini");
      }
    }

    return responseText;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};
