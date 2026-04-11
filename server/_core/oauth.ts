import type { Express, Request, Response } from "express";

/**
 * OAuth routes - Manus OAuth removed.
 * Email/password and Google OAuth are handled via tRPC auth procedures.
 */
export function registerOAuthRoutes(app: Express) {
  // Legacy callback route - redirect to login page
  app.get("/api/oauth/callback", async (_req: Request, res: Response) => {
    res.redirect(302, "/login");
  });
}
