// Prompt templates for outbound emails.
// Both kinds (invite + rejection) come back as { subject, body } JSON so the
// frontend can preview and edit before sending.

const SYSTEM = `You write candidate-facing recruiting emails. Be warm, concise, professional, and specific.

Constraints:
- Plain text, no markdown.
- 3-5 short paragraphs.
- Address the candidate by first name when known.
- Never invent details (salary, start date, interviewer names).
- Output ONLY JSON: { "subject": string, "body": string }`;

const inviteUser = ({ candidate, jobTitle, company, customTemplate }) => `Write an interview invite email.

Candidate: ${candidate.name || 'the candidate'}
Job: ${jobTitle}
Company: ${company}
${customTemplate ? `Use this template / tone as a starting point:\n"""\n${customTemplate}\n"""\n` : ''}
Mention briefly why they stood out (use their parsed strengths if helpful):
${JSON.stringify({ skills: candidate.skills, experience: candidate.experience }, null, 2)}

Ask them for two 30-minute slots that work for an initial chat. Sign off as "the hiring team".`;

const rejectionUser = ({ candidate, jobTitle, company, customTemplate }) => `Write a polite rejection email.

Candidate: ${candidate.name || 'the candidate'}
Job: ${jobTitle}
Company: ${company}
${customTemplate ? `Use this template / tone as a starting point:\n"""\n${customTemplate}\n"""\n` : ''}
Tone: respectful, brief, encouraging. Thank them for their time. Do not give detailed scoring feedback. Encourage them to apply for future roles. Sign off as "the hiring team".`;

const userPrompt = (kind, ctx) => {
  if (kind === 'invite') return inviteUser(ctx);
  if (kind === 'rejection') return rejectionUser(ctx);
  throw new Error(`Unknown email kind: ${kind}`);
};

module.exports = { SYSTEM, userPrompt };
