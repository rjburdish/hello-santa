// Viseme mapping: Provider phonemes/visemes -> OVR 15 morph targets
// OVR visemes: aa, e, ih, oh, ou, uh, fv, l, m, n, rr, s, th, ch, sil

export type OVRViseme =
  | 'aa' // open mouth (ah)
  | 'e' // lips spread (ee)
  | 'ih' // slightly open (ih)
  | 'oh' // rounded lips (oh)
  | 'ou' // rounded lips forward (oo)
  | 'uh' // relaxed (uh)
  | 'fv' // bottom lip to teeth (f/v)
  | 'l' // tongue to roof (l)
  | 'm' // lips together (m)
  | 'n' // tongue behind teeth (n)
  | 'rr' // slight tongue curl (r)
  | 's' // teeth nearly together (s)
  | 'th' // tongue between teeth (th)
  | 'ch' // lips slightly forward (ch/sh)
  | 'sil'; // silence/neutral

// Stub mapping - will be expanded based on chosen TTS provider in V0.4
export const providerToOVR: Record<string, OVRViseme> = {
  // Example mappings (will be filled based on actual provider)
  silence: 'sil',
  // Add more mappings as needed
};

export function normalizeViseme(providerViseme: string): OVRViseme {
  return providerToOVR[providerViseme] || 'sil';
}
