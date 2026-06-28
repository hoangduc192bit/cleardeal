import { GoogleGenerativeAI } from "@google/generative-ai";

function getKeys(): string[] {
  const rawKeys = process.env.GEMINI_API_KEY;
  if (!rawKeys) return [];
  return rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
}

export async function generateInsight(
  prompt: string,
  fallback: string,
): Promise<string> {
  const keys = getKeys();
  if (keys.length === 0) {
    console.error("No GEMINI_API_KEY configured.");
    return fallback;
  }

  let lastError: unknown;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const ai = new GoogleGenerativeAI(key);
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.warn(`Gemini API Error with key index ${i}:`, error);
      lastError = error;
    }
  }

  console.error("All Gemini API keys failed in generateInsight. Last error:", lastError);
  return fallback;
}

// Returns parsed JSON. Prompt must instruct the model to respond with valid JSON only.
export async function generateStructured<T>(
  prompt: string,
  fallback: T,
): Promise<T> {
  const keys = getKeys();
  if (keys.length === 0) {
    console.error("No GEMINI_API_KEY configured.");
    return fallback;
  }

  let lastError: unknown;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const ai = new GoogleGenerativeAI(key);
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const result = await model.generateContent(
        `${prompt}\n\nRespond with ONLY valid JSON. No markdown, no explanation, no code fences.`,
      );
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.warn(`Gemini API Error with key index ${i} in generateStructured:`, error);
      lastError = error;
    }
  }

  console.error("All Gemini API keys failed in generateStructured. Last error:", lastError);
  return fallback;
}
