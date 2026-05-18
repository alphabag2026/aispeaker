export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleClientId: process.env.VITE_GOOGLE_CLIENT_ID ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  klingAccessKey: process.env.KLING_ACCESS_KEY ?? "",
  klingSecretKey: process.env.KLING_SECRET_KEY ?? "",
  didApiKey: process.env.DID_API_KEY ?? "",
};

export function validateServerEnv() {
  const required = [
    ["DATABASE_URL", ENV.databaseUrl],
    ["JWT_SECRET", ENV.cookieSecret],
  ] as const;

  const missing = required
    .filter(([, value]) => !value || value.trim().length === 0)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (ENV.cookieSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
}
