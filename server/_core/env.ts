function optionalEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function requiredInProduction(name: string): string {
  const value = optionalEnv(name);
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: requiredInProduction("JWT_SECRET"),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  googleClientId: process.env.VITE_GOOGLE_CLIENT_ID ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  notificationWebhookUrl: process.env.OWNER_NOTIFICATION_WEBHOOK_URL ?? "",
  klingAccessKey: process.env.KLING_ACCESS_KEY ?? "",
  klingSecretKey: process.env.KLING_SECRET_KEY ?? "",
  didApiKey: process.env.DID_API_KEY ?? "",
};
