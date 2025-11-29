// Minimal safety layer - V0.4 implementation
// Child-safety-first: blocklist, PII detection, sanitization
// NOTE: This is MINIMAL for V0 POC. V1 production requires comprehensive safety (see plan)

// Unsafe topics blocklist (minimal for V0.4, will expand in V1)
const UNSAFE_KEYWORDS = [
  'kill',
  'die',
  'death',
  'blood',
  'gun',
  'weapon',
  'violent',
  'hate',
  'sex',
  'drug',
  'alcohol',
  'beer',
  'wine',
];

// PII pattern detection (basic heuristics)
const PII_PATTERNS = [
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // Phone numbers
  /\d{3}[-\s]?\d{2}[-\s]?\d{4}/, // SSN
  /\b\d{5}(?:-\d{4})?\b/, // ZIP codes
  /\b[A-Z][a-z]+\s(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/i, // Street addresses
  /\b(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/i, // Name introductions
];

export function isUnsafeTopic(text: string): boolean {
  const lowerText = text.toLowerCase();
  return UNSAFE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export function containsPII(text: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeInput(text: string): string {
  // Basic sanitization
  return text.trim().slice(0, 500); // Limit length to 500 chars
}
