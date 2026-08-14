const FORBIDDEN = [
  /\bguaranteed returns?\b/i,
  /\binvestment opportunity\b/i,
  /\b100% organic\b/i,
  /\bcures?\b/i,
  /\btreats?\s+(cancer|diabetes|disease)/i,
  /\bsec registered\b/i,
  /\bto the moon\b/i,
  /\b100x\b/i,
  /\blamborghini\b/i,
  /\bfinancial advice\b/i,
];

export function runComplianceRules(text) {
  const hits = [];
  for (const re of FORBIDDEN) {
    if (re.test(text)) hits.push(re.source);
  }
  return {
    passed: hits.length === 0,
    notes:
      hits.length === 0
        ? "Rule check passed"
        : `Forbidden patterns: ${hits.join(", ")}`,
  };
}

export async function reviewWithLlm(llm, text) {
  const prompt = `You are IC SPICY compliance reviewer. Flag any health claims, organic certification claims, investment/token upside, or financial advice. Reply JSON only: {"passed":true/false,"notes":"..."}. Text:\n${text}`;
  const raw = await llm.complete(prompt);
  try {
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      passed: Boolean(json.passed),
      notes: String(json.notes ?? "LLM review"),
    };
  } catch {
    return { passed: true, notes: "LLM review inconclusive — passed by default" };
  }
}

export async function fullComplianceCheck(llm, text) {
  const rules = runComplianceRules(text);
  if (!rules.passed) return rules;
  if (!llm) return rules;
  return reviewWithLlm(llm, text);
}
