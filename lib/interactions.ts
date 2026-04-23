// Known drug interaction pairs (lowercase names)
const INTERACTION_PAIRS: { drugs: [string, string]; severity: 'high' | 'moderate'; message: string }[] = [
  { drugs: ['ibuprofen', 'warfarin'], severity: 'high', message: 'May significantly increase bleeding risk. Consult physician immediately.' },
  { drugs: ['ibuprofen', 'aspirin'], severity: 'moderate', message: 'Combined use may increase GI bleeding risk.' },
  { drugs: ['atorvastatin', 'grapefruit'], severity: 'moderate', message: 'Grapefruit may increase blood levels of Atorvastatin. Consult MD.' },
  { drugs: ['metformin', 'alcohol'], severity: 'moderate', message: 'Alcohol increases risk of lactic acidosis with Metformin.' },
  { drugs: ['lisinopril', 'potassium'], severity: 'moderate', message: 'May cause dangerously high potassium levels.' },
  { drugs: ['warfarin', 'aspirin'], severity: 'high', message: 'Significantly increases bleeding risk. Avoid unless directed by physician.' },
  { drugs: ['sertraline', 'tramadol'], severity: 'high', message: 'Risk of serotonin syndrome. Do not combine.' },
  { drugs: ['ciprofloxacin', 'antacid'], severity: 'moderate', message: 'Antacids reduce ciprofloxacin absorption. Take 2 hours apart.' },
  { drugs: ['amoxicillin', 'methotrexate'], severity: 'high', message: 'Amoxicillin may increase methotrexate toxicity.' },
];

export type Interaction = {
  drugA: string;
  drugB: string;
  severity: 'high' | 'moderate';
  message: string;
};

export function checkInteractions(medicineNames: string[]): Interaction[] {
  const found: Interaction[] = [];
  const lower = medicineNames.map(n => n.toLowerCase());

  for (const pair of INTERACTION_PAIRS) {
    const [a, b] = pair.drugs;
    const hasA = lower.some(n => n.includes(a));
    const hasB = lower.some(n => n.includes(b));
    if (hasA && hasB) {
      const nameA = medicineNames.find(n => n.toLowerCase().includes(a)) ?? a;
      const nameB = medicineNames.find(n => n.toLowerCase().includes(b)) ?? b;
      found.push({ drugA: nameA, drugB: nameB, severity: pair.severity, message: pair.message });
    }
  }
  return found;
}

export function checkInteractionsForOne(name: string, others: string[]): { name: string; safe: boolean; desc: string }[] {
  return others.map(other => {
    const lower = name.toLowerCase();
    const otherLower = other.toLowerCase();
    for (const pair of INTERACTION_PAIRS) {
      const [a, b] = pair.drugs;
      if ((lower.includes(a) && otherLower.includes(b)) || (lower.includes(b) && otherLower.includes(a))) {
        return { name: other, safe: false, desc: pair.message };
      }
    }
    return { name: other, safe: true, desc: 'No known adverse reactions detected in cabinet.' };
  });
}
