import type { Interaction } from './interactions';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function checkInteractionsAI(medicineNames: string[]): Promise<Interaction[]> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here' || medicineNames.length < 2) return [];

  const prompt = `You are a clinical pharmacist. Given this list of medicines a patient is taking:
${medicineNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Identify any clinically significant drug-drug interactions.

Respond ONLY with a valid JSON array. Each object must have:
- "drugA": string (first drug name as given)
- "drugB": string (second drug name as given)
- "severity": "high" | "moderate" | "low"
- "message": string (one sentence, plain English, what the risk is)

If no interactions exist, return an empty array: []
Do not include any text outside the JSON array.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content ?? '';

    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item: any) =>
        typeof item.drugA === 'string' &&
        typeof item.drugB === 'string' &&
        typeof item.severity === 'string' &&
        typeof item.message === 'string'
    ) as Interaction[];
  } catch {
    return [];
  }
}
