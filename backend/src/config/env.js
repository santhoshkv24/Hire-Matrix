const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(process.cwd(), ".env"), silent: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z
    .string()
    .min(1)
    .default("mongodb://127.0.0.1:27017/hirematrix"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(8).default("change-me-access-secret"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_SECRET: z.string().min(8).default("change-me-refresh-secret"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ADMIN_EMAIL: z.string().email().default("admin@hirematrix.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  GMAIL_USER: z.union([z.string().email(), z.literal("")]).optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("HireMatrix <no-reply@hirematrix.local>"),
  GOOGLE_GENAI_USE_VERTEXAI: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  SCORING_MODEL: z.string().default("gemini-2.5-flash"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  APP_FRONTEND_URL: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${fields}`);
}

const env = {
  ...parsed.data,
  allowedOrigins: parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  googleGenAiUseVertexAi:
    String(parsed.data.GOOGLE_GENAI_USE_VERTEXAI || "").toLowerCase() === "true",
};

module.exports = env;