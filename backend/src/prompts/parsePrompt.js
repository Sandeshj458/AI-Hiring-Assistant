// Prompt template for resume parsing.
// The schema is tight on purpose — the model returns JSON we can trust.

const SYSTEM = `You are an expert resume parser. Given raw resume text, extract structured candidate data.

Rules:
- Output ONLY valid JSON matching the schema. No commentary, no code fences.
- If a field is genuinely missing, use null (or [] for lists). Never invent data.
- Normalize phone numbers to digits with optional leading +. Keep emails lowercase.
- "skills" should be concrete technologies / tools / methodologies (e.g. "Python", "Kubernetes", "A/B testing"), not soft skills.
- "experience.years" is the total years of professional experience, rounded to the nearest 0.5. If unclear, estimate from dates.
- "experience.companies" is an array of { company, role, start, end } where dates are "YYYY-MM" or "Present".
- "education" is an array of { degree, institution, year }.`;

const userPrompt = (resumeText) =>
  `Resume text:\n"""\n${resumeText}\n"""\n\nReturn JSON with this exact shape:
{
  "name": string|null,
  "email": string|null,
  "phone": string|null,
  "skills": string[],
  "experience": {
    "years": number|null,
    "companies": [{ "company": string, "role": string, "start": string|null, "end": string|null }]
  },
  "education": [{ "degree": string, "institution": string, "year": number|null }]
}`;

module.exports = { SYSTEM, userPrompt };
