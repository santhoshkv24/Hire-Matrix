const env = require("../config/env");

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch (_err) {
      return null;
    }
  }
};

const buildFallbackScore = ({ resumeText, requiredSkills = [] }) => {
  const normalizedResume = String(resumeText || "").toLowerCase();
  const skills = requiredSkills.map((skill) => String(skill).toLowerCase().trim());

  const matchedSkills = skills.filter((skill) => skill && normalizedResume.includes(skill));

  const scoreFromSkills = skills.length > 0 ? (matchedSkills.length / skills.length) * 70 : 35;
  const scoreFromLength = Math.min(normalizedResume.length / 50, 30);
  const score = Math.max(0, Math.min(100, Math.round(scoreFromSkills + scoreFromLength)));

  return {
    score,
    strengths:
      matchedSkills.length > 0
        ? matchedSkills.slice(0, 5)
        : ["Resume parsed successfully", "Profile available for review"],
    gaps: skills.filter((skill) => !matchedSkills.includes(skill)).slice(0, 5),
    model: "fallback-heuristic",
  };
};

const scoreResumeWithVertex = async ({ resumeText, jobTitle, jobDescription, requiredSkills }) => {
  if (!env.googleGenAiUseVertexAi || !env.GOOGLE_CLOUD_PROJECT) {
    return null;
  }

  const { GoogleGenAI, Type } = await import("@google/genai");

  const client = new GoogleGenAI({
    vertexai: true,
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION,
    apiVersion: "v1",
  });

  const prompt = [
    "You are a strict resume scoring engine.",
    "Be deterministic: for the same input, return the same score.",
    "Do not guess missing information.",
    "Use this exact weighted rubric (0-100):",
    "1) Required skill coverage: 0-50",
    "2) Relevant project/work evidence: 0-25",
    "3) Role alignment and domain fit: 0-15",
    "4) Evidence quality (impact metrics, clarity): 0-10",
    "Round final score to nearest whole number.",
    "Return JSON only with shape:",
    '{"score": number, "strengths": string[], "gaps": string[]}',
    "Keep strengths and gaps concise (max 5 each).",
    `Job title: ${jobTitle || "Unknown"}`,
    `Job description: ${jobDescription || ""}`,
    `Required skills: ${(requiredSkills || []).join(", ")}`,
    `Resume text: ${resumeText || ""}`,
  ].join("\n");

  const response = await client.models.generateContent({
    model: env.SCORING_MODEL,
    contents: prompt,
    config: {
      temperature: 0,
      topP: 0.1,
      topK: 1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          gaps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["score", "strengths", "gaps"],
      },
    },
  });

  const text = response?.text;
  if (!text) {
    console.warn("[scoring] Vertex response did not include text content");
    return null;
  }

  const parsed = safeJsonParse(text);
  if (!parsed) {
    console.warn("[scoring] Vertex response was not valid JSON");
    return null;
  }

  const normalizedScore = Number.isFinite(Number(parsed.score))
    ? Math.max(0, Math.min(100, Math.round(Number(parsed.score))))
    : 0;

  return {
    score: normalizedScore,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    model: env.SCORING_MODEL,
  };
};

const scoreResume = async ({ resumeText, job }) => {
  const fallback = buildFallbackScore({
    resumeText,
    requiredSkills: job?.requiredSkills,
  });

  try {
    const aiResult = await scoreResumeWithVertex({
      resumeText,
      jobTitle: job?.title,
      jobDescription: job?.description,
      requiredSkills: job?.requiredSkills,
    });

    return aiResult || fallback;
  } catch (error) {
    console.warn("[scoring] Vertex scoring failed, using fallback:", error.message);
    return fallback;
  }
};

module.exports = {
  scoreResume,
};