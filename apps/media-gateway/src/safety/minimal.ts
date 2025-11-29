// Minimal safety layer stub - will be expanded in V0.4+
// Child-safety-first: blocklist, PII detection, sanitization

export function isUnsafeTopic(text: string): boolean {
  // Stub - will implement in V0.4
  return false;
}

export function containsPII(text: string): boolean {
  // Stub - will implement in V0.4
  return false;
}

export function sanitizeInput(text: string): string {
  // Stub - basic sanitization
  return text.trim();
}
