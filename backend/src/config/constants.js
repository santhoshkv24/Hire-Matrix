const ROLE_KEYS = {
  ADMIN: "admin",
  RECRUITER: "recruiter",
  HIRING_MANAGER: "hiring_manager",
  INTERVIEWER: "interviewer",
  APPLICANT: "applicant",
};

const ROLE_DISPLAY = {
  [ROLE_KEYS.ADMIN]: "Admin",
  [ROLE_KEYS.RECRUITER]: "Recruiter",
  [ROLE_KEYS.HIRING_MANAGER]: "Hiring Manager",
  [ROLE_KEYS.INTERVIEWER]: "Interviewer",
  [ROLE_KEYS.APPLICANT]: "Applicant",
};

const PIPELINE_STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const STAGE_TRANSITIONS = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

const DECISION_STATUSES = [
  "pending",
  "selected",
  "rejected",
];

module.exports = {
  ROLE_KEYS,
  ROLE_DISPLAY,
  PIPELINE_STAGES,
  STAGE_TRANSITIONS,
  DECISION_STATUSES,
};