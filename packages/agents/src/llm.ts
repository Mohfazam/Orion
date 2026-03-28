import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

export const ask = async (
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 512
): Promise<string> => {
  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
};

export const askJSON = async <T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<T | null> => {
  const raw = await ask(systemPrompt, userPrompt, maxTokens);
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn("[llm] failed to parse JSON response:", raw);
    return null;
  }
};