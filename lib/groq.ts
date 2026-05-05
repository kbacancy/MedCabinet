import type { Interaction } from './interactions';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const CATEGORIES = ['Pain Relief', 'Antibiotics', 'Supplements', 'Vitamins', 'Blood Pressure', 'Diabetes', 'Cholesterol', 'Other'];

export async function suggestCategory(medicineName: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here' || medicineName.trim().length < 3) return null;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{
          role: 'user',
          content: `You are a pharmacist. Which category does the medicine "${medicineName}" belong to?\nChoose ONLY one from this exact list: ${CATEGORIES.join(', ')}.\nRespond with ONLY the category name, nothing else.`,
        }],
        temperature: 0,
        max_tokens: 16,
      }),
    });

    if (!response.ok) return null;
    const json = await response.json();
    const raw = (json.choices?.[0]?.message?.content ?? '').trim();
    return CATEGORIES.find(c => raw.toLowerCase().includes(c.toLowerCase())) ?? null;
  } catch {
    return null;
  }
}

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

export type FoodInteraction = {
  medicine: string;
  food: string;
  severity: 'high' | 'moderate' | 'low';
  message: string;
};

export async function checkFoodInteractionsAI(medicineNames: string[]): Promise<FoodInteraction[]> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here' || medicineNames.length === 0) return [];

  const prompt = `You are a clinical pharmacist. For the following medicines:
${medicineNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

List any clinically significant food-drug interactions (e.g. grapefruit with statins, dairy with antibiotics, alcohol with sedatives, vitamin K with warfarin).

Respond ONLY with a valid JSON array. Each object must have:
- "medicine": string (the medicine name as given)
- "food": string (the food/substance to avoid)
- "severity": "high" | "moderate" | "low"
- "message": string (one sentence, plain English, the risk or recommendation)

If no food interactions exist, return an empty array: []
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
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item: any) =>
        typeof item.medicine === 'string' &&
        typeof item.food === 'string' &&
        typeof item.severity === 'string' &&
        typeof item.message === 'string'
    ) as FoodInteraction[];
  } catch {
    return [];
  }
}
