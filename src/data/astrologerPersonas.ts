export interface AstrologerPersona {
  id: string
  name: string
  rating: number
  reviews: number
  ratePerMin: number
  online: boolean
  bio: string
  tags: string[]
}

export const ASTROLOGER_PERSONAS: AstrologerPersona[] = [
  {
    id: 'ravi-sharma',
    name: 'Ravi Sharma',
    rating: 4.8,
    reviews: 214,
    ratePerMin: 25,
    online: true,
    bio: 'Third-generation Vedic astrologer with 18+ years reading Jyotish charts. Specializes in life-path clarity and dasha analysis. Warm, direct, no fluff.',
    tags: ['Vedic Astrology', 'Career Guidance', 'Life Path'],
  },
  {
    id: 'meera-kapoor',
    name: 'Meera Kapoor',
    rating: 4.7,
    reviews: 189,
    ratePerMin: 20,
    online: true,
    bio: 'Tarot reader and relationship coach. Blends Rider-Waite tarot with modern attachment theory. Best for love, breakups, and hard conversations.',
    tags: ['Tarot', 'Relationship Compatibility', 'Love'],
  },
  {
    id: 'arjun-verma',
    name: 'Arjun Verma',
    rating: 4.9,
    reviews: 342,
    ratePerMin: 30,
    online: true,
    bio: 'Lal Kitab and remedial astrologer. Practical, remedy-focused sessions for career blocks, family tension, and financial delays.',
    tags: ['Lal Kitab', 'Remedies', 'Career Guidance'],
  },
  {
    id: 'sophia-lang',
    name: 'Sophia Lang',
    rating: 4.6,
    reviews: 121,
    ratePerMin: 35,
    online: true,
    bio: 'Western natal chart reader with a psychological, Jungian lean. Great for self-understanding, transitions, and creative direction.',
    tags: ['Western Astrology', 'Natal Chart', 'Self-Discovery'],
  },
]
