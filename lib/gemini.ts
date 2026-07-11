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
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash",
            messages: [{ role: "user", content: prompt }]
          })
        });
        if (response.ok) {
          const json = await response.json();
          return json.choices?.[0]?.message?.content ?? fallback;
        }
      } catch (error) {
        console.warn("OpenRouter API Error in generateInsight:", error);
      }
    }
    console.error("No GEMINI_API_KEY or OPENROUTER_API_KEY configured.");
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
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) {
            const cleaned = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
            return JSON.parse(cleaned) as T;
          }
        }
      } catch (error) {
        console.warn("OpenRouter API Error in generateStructured:", error);
      }
    }
    console.error("No GEMINI_API_KEY or OPENROUTER_API_KEY configured.");
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
