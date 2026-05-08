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

export type HealthMotivation = {
  emoji: string;
  title: string;
  message: string;
};

export async function getHealthMotivation(context: {
  medicineCount: number;
  takenCount: number;
  adherencePercent: number;
  activeCourses: string[];
  allTaken: boolean;
}): Promise<HealthMotivation | null> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') return null;

  const { medicineCount, takenCount, adherencePercent, activeCourses, allTaken } = context;

  let contextStr = 'The user has no medicines added yet.';
  if (medicineCount > 0) {
    contextStr = `The user has ${medicineCount} medicine(s) in their cabinet. They have taken ${takenCount} of ${medicineCount} medicines today (${adherencePercent}% adherence).`;
    if (activeCourses.length > 0) {
      contextStr += ` Active prescription/antibiotic courses: ${activeCourses.join(', ')}.`;
    }
    if (allTaken) contextStr += ' All doses taken today — excellent adherence!';
  }

  const prompt = `You are a warm, encouraging health companion in a medicine tracking app. Generate a short personalized health message for today.

Context: ${contextStr}

Rules:
- Active antibiotic/prescription course → gently remind the user to complete the full course as prescribed
- All doses taken → celebrate their effort + one brief wellness tip
- Some doses pending → encourage taking remaining medicines + a wellness tip
- No medicines → share an uplifting wellness tip (hydration, sleep, nutrition, or movement)
- 1–2 sentences max, warm, positive, never preachy
- Pick a fitting single emoji

Respond ONLY with valid JSON (no extra text):
{"emoji": "🌿", "title": "Short 2-4 word title", "message": "Your message here."}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 128,
      }),
    });
    if (!response.ok) return null;
    const json = await response.json();
    const content = (json.choices?.[0]?.message?.content ?? '').trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.emoji === 'string' && typeof parsed.title === 'string' && typeof parsed.message === 'string') {
      return parsed as HealthMotivation;
    }
    return null;
  } catch {
    return null;
  }
}

export type MoodAnswers = {
  energy: number;
  emotionalState: string;
  physical: string[];
  trigger: string | null;
  sleep: number;
};

export type MoodAnalysis = {
  primaryMood: string;
  severity: 'mild' | 'moderate' | 'high';
  insight: string;
  wellnessMessage: string;
  suggestedAction: 'breathing' | 'journal' | 'walk' | 'music' | 'rest';
  emoji: string;
};

export async function analyzeMoodAssessment(answers: MoodAnswers): Promise<MoodAnalysis | null> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') return null;

  const prompt = `You are a compassionate mental wellness AI. Analyze this mood check-in and provide a warm, helpful assessment.

Energy level: ${answers.energy}/5
Emotional state: ${answers.emotionalState}
Physical symptoms: ${answers.physical.length > 0 ? answers.physical.join(', ') : 'none reported'}
Recent trigger: ${answers.trigger ?? 'nothing specific'}
Sleep quality last night: ${answers.sleep}/5

Rules:
- Be warm, non-clinical, and encouraging
- wellnessMessage must be 2-3 sentences that genuinely uplift the person
- suggestedAction should be the single most helpful thing right now
- insight should be one honest, empathetic sentence about their current state

Respond ONLY with valid JSON (no extra text):
{"primaryMood":"one word","severity":"mild","insight":"one empathetic sentence","wellnessMessage":"2-3 uplifting sentences","suggestedAction":"breathing","emoji":"single emoji"}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });
    if (!response.ok) return null;
    const json = await response.json();
    const content = (json.choices?.[0]?.message?.content ?? '').trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (
      typeof parsed.primaryMood === 'string' &&
      typeof parsed.severity === 'string' &&
      typeof parsed.insight === 'string' &&
      typeof parsed.wellnessMessage === 'string' &&
      typeof parsed.suggestedAction === 'string' &&
      typeof parsed.emoji === 'string'
    ) {
      return parsed as MoodAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

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
