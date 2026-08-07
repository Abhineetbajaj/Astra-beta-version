// The standard Navagraha beej (seed) mantras — the widely-published triple-vowel form
// ("Om [beej] Sah [Planet]aya Namaha") consistent across Vedic astrology reference sources.
// Fixed, verified text — never Gemini-generated. Same principle as the rest of this project:
// the LLM writes reflective prose AROUND a fact, it never invents the fact itself, and sacred
// mantra syllables are exactly the kind of fact that must never be left to a model to guess.

export const GRAHA_MANTRAS: Record<string, string> = {
  Sun: 'Om Hraam Hreem Hraum Sah Suryaya Namaha',
  Moon: 'Om Shraam Shreem Shraum Sah Chandraya Namaha',
  Mars: 'Om Kraam Kreem Kraum Sah Bhaumaya Namaha',
  Mercury: 'Om Braam Breem Braum Sah Budhaya Namaha',
  Jupiter: 'Om Graam Greem Graum Sah Gurave Namaha',
  Venus: 'Om Draam Dreem Draum Sah Shukraya Namaha',
  Saturn: 'Om Praam Preem Praum Sah Shanaischaraya Namaha',
  Rahu: 'Om Bhraam Bhreem Bhraum Sah Rahave Namaha',
  Ketu: 'Om Sraam Sreem Sraum Sah Ketave Namaha',
}
