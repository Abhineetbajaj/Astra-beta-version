-- Seed reference data. Mirrors src/data/rashis.ts, src/data/nakshatras.ts,
-- src/data/dashaSequence.ts, and src/astro-engine/guna.ts exactly — if those
-- TS files change, update this file in the same commit.

insert into public.ref_rashis (index, name, sanskrit, element, lord) values
  (0, 'Aries', 'Mesha', 'Fire', 'Mars'),
  (1, 'Taurus', 'Vrishabha', 'Earth', 'Venus'),
  (2, 'Gemini', 'Mithuna', 'Air', 'Mercury'),
  (3, 'Cancer', 'Karka', 'Water', 'Moon'),
  (4, 'Leo', 'Simha', 'Fire', 'Sun'),
  (5, 'Virgo', 'Kanya', 'Earth', 'Mercury'),
  (6, 'Libra', 'Tula', 'Air', 'Venus'),
  (7, 'Scorpio', 'Vrishchika', 'Water', 'Mars'),
  (8, 'Sagittarius', 'Dhanu', 'Fire', 'Jupiter'),
  (9, 'Capricorn', 'Makara', 'Earth', 'Saturn'),
  (10, 'Aquarius', 'Kumbha', 'Air', 'Saturn'),
  (11, 'Pisces', 'Meena', 'Water', 'Jupiter');

insert into public.ref_nakshatras (index, name, lord, start_degree) values
  (0, 'Ashwini', 'Ketu', 0),
  (1, 'Bharani', 'Venus', 13.333333333333334),
  (2, 'Krittika', 'Sun', 26.666666666666668),
  (3, 'Rohini', 'Moon', 40),
  (4, 'Mrigashira', 'Mars', 53.33333333333333),
  (5, 'Ardra', 'Rahu', 66.66666666666667),
  (6, 'Punarvasu', 'Jupiter', 80),
  (7, 'Pushya', 'Saturn', 93.33333333333333),
  (8, 'Ashlesha', 'Mercury', 106.66666666666667),
  (9, 'Magha', 'Ketu', 120),
  (10, 'Purva Phalguni', 'Venus', 133.33333333333334),
  (11, 'Uttara Phalguni', 'Sun', 146.66666666666666),
  (12, 'Hasta', 'Moon', 160),
  (13, 'Chitra', 'Mars', 173.33333333333334),
  (14, 'Swati', 'Rahu', 186.66666666666666),
  (15, 'Vishakha', 'Jupiter', 200),
  (16, 'Anuradha', 'Saturn', 213.33333333333334),
  (17, 'Jyeshtha', 'Mercury', 226.66666666666666),
  (18, 'Mula', 'Ketu', 240),
  (19, 'Purva Ashadha', 'Venus', 253.33333333333334),
  (20, 'Uttara Ashadha', 'Sun', 266.6666666666667),
  (21, 'Shravana', 'Moon', 280),
  (22, 'Dhanishta', 'Mars', 293.3333333333333),
  (23, 'Shatabhisha', 'Rahu', 306.6666666666667),
  (24, 'Purva Bhadrapada', 'Jupiter', 320),
  (25, 'Uttara Bhadrapada', 'Saturn', 333.3333333333333),
  (26, 'Revati', 'Mercury', 346.6666666666667);

insert into public.ref_vimshottari_sequence (position, lord, years) values
  (1, 'Ketu', 7),
  (2, 'Venus', 20),
  (3, 'Sun', 6),
  (4, 'Moon', 10),
  (5, 'Mars', 7),
  (6, 'Rahu', 18),
  (7, 'Jupiter', 16),
  (8, 'Saturn', 19),
  (9, 'Mercury', 17);

insert into public.ref_grahas (key, name, significations) values
  ('Sun', 'Surya', 'Soul, vitality, authority, father, government, self-confidence'),
  ('Moon', 'Chandra', 'Mind, emotions, mother, nurturing, public standing, fluctuation'),
  ('Mars', 'Mangala', 'Drive, courage, conflict, siblings, land/property, physical energy'),
  ('Mercury', 'Budha', 'Intellect, communication, commerce, analysis, adaptability'),
  ('Jupiter', 'Guru', 'Wisdom, expansion, wealth, teachers, dharma, optimism'),
  ('Venus', 'Shukra', 'Love, beauty, relationships, luxury, art, comfort'),
  ('Saturn', 'Shani', 'Discipline, delay, structure, karma, longevity, hard-won results'),
  ('Rahu', 'Rahu', 'Obsession, ambition, foreign/unconventional paths, sudden gain'),
  ('Ketu', 'Ketu', 'Detachment, spirituality, past-life residue, sudden loss/release');

insert into public.ref_bhavas (house, name, significations) values
  (1, 'Tanu Bhava', 'Self, body, personality, overall vitality'),
  (2, 'Dhana Bhava', 'Wealth, family, speech, accumulated resources'),
  (3, 'Sahaja Bhava', 'Courage, siblings, short journeys, effort'),
  (4, 'Sukha Bhava', 'Home, mother, emotional foundation, property'),
  (5, 'Putra Bhava', 'Children, intellect, creativity, speculation'),
  (6, 'Ripu Bhava', 'Health, debts, obstacles, daily work, enemies'),
  (7, 'Yuvati Bhava', 'Partnership, marriage, business relationships'),
  (8, 'Ayu Bhava', 'Longevity, transformation, shared/inherited resources, crisis'),
  (9, 'Dharma Bhava', 'Fortune, higher learning, father, long journeys, ethics'),
  (10, 'Karma Bhava', 'Career, public standing, authority, achievement'),
  (11, 'Labha Bhava', 'Gains, income, aspirations, social networks'),
  (12, 'Vyaya Bhava', 'Loss, expenditure, rest, foreign lands, release');

insert into public.ref_kuta_rules (kuta, max_points, description) values
  ('bhakoot', 7, 'Moon-sign distance compatibility — 0 points when the signs fall in an inauspicious 2/12, 6/8, or 5/7 relationship, else full points.'),
  ('gana', 6, 'Nakshatra temperament group match (Deva/Manushya/Rakshasa) — full points if matching, 0 if directly opposed (Deva-Rakshasa), partial otherwise.'),
  ('nadi', 8, 'Nakshatra constitutional group (Aadi/Madhya/Antya) — full points unless both fall in the same Nadi group, which scores 0.');

insert into public.ref_yoga_definitions (key, name, category, description) values
  ('dhana_yoga', 'Dhana Yoga', 'wealth', 'Lords of the 2nd (wealth) and 11th (gains) houses occupy each other''s sign or share a sign — a classical wealth-accumulation combination.'),
  ('lakshmi_yoga', 'Lakshmi Yoga', 'wealth', 'Venus, significator of prosperity, sits in its own or exalted sign in a kendra (1/4/7/10) or trikona (1/5/9) from the ascendant.'),
  ('guru_mangala_yoga', 'Guru-Mangala Yoga', 'wealth', 'Jupiter (expansion) and Mars (drive/property) conjunct in the same sign — associated with wealth through effort, land, or enterprise. (Conjunction only; full graha-drishti aspect rules are not evaluated.)');

insert into public.astrologers (name, bio, specialties, years_experience, rate_per_minute, is_active) values
  ('Ananya Rao', 'Vedic astrologer specializing in career and life-path guidance, trained in classical Parashari technique.', array['Career', 'Life Path', 'Dasha timing'], 12, 15, true),
  ('Vikram Sethi', 'Relationship and compatibility specialist, focuses on synastry and family dynamics.', array['Relationships', 'Compatibility', 'Family'], 9, 12, true),
  ('Meera Iyer', 'Remedial astrology and muhurta (timing) specialist for major life decisions.', array['Remedies', 'Muhurta', 'Timing'], 15, 18, true),
  ('Devika Nair', 'Financial and business astrology specialist, works with entrepreneurs on venture timing.', array['Financial Astrology', 'Business', 'Wealth Yogas'], 10, 20, true);
