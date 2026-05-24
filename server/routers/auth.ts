import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import bcrypt from "bcryptjs";
import { sdk } from "../_core/sdk";
import axios from "axios";
import crypto from "crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  // Get Google Client ID for frontend
  getGoogleClientId: publicProcedure.query(() => {
    return { clientId: process.env.VITE_GOOGLE_CLIENT_ID || "" };
  }),

  // Email/Password Registration
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = await db.createUserWithEmail({
        email: input.email,
        passwordHash,
        name: input.name,
      });
      const user = await db.getUserById(userId);
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration failed" });
      const token = await sdk.createSessionToken(user.id, { email: user.email || "", name: user.name || "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return { success: true, user };
    }),

  // Email/Password Login
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }
      const token = await sdk.createSessionToken(user.id, { email: user.email || "", name: user.name || "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return { success: true, user };
    }),

  // Google OAuth Login
  googleLogin: publicProcedure
    .input(z.object({
      credential: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify Google ID token
      let googlePayload: { sub: string; email: string; name: string; picture?: string };
      try {
        const response = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${input.credential}`
        );
        googlePayload = {
          sub: response.data.sub,
          email: response.data.email,
          name: response.data.name || response.data.email.split("@")[0],
          picture: response.data.picture,
        };
      } catch (err) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Google authentication failed." });
      }

      // Check if user exists by Google ID
      let user = await db.getUserByGoogleId(googlePayload.sub);
      if (!user) {
        // Check if email already exists
        user = await db.getUserByEmail(googlePayload.email);
        if (user) {
          // Link Google to existing account
          await db.linkGoogleToUser(user.id, googlePayload.sub);
        } else {
          // Create new user
          const userId = await db.createUserWithGoogle({
            googleId: googlePayload.sub,
            email: googlePayload.email,
            name: googlePayload.name,
            avatarUrl: googlePayload.picture,
          });
          user = await db.getUserById(userId);
        }
      }
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed" });

      const token = await sdk.createSessionToken(user.id, { email: user.email || "", name: user.name || "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
      return { success: true, user };
    }),

  // Forgot Password - generate reset token
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        // Don't reveal whether email exists
        return { success: true, message: "If the email is registered, a password reset link will be sent." };
      }
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.savePasswordResetToken(user.id, token, expiresAt);
      // In production, send email with reset link
      // For now, return token (development mode)
      console.log(`[Password Reset] Token for ${input.email}: ${token}`);
      return { success: true, message: "If the email is registered, a password reset link will be sent.", resetToken: token };
    }),

  // Reset Password with token
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const resetRecord = await db.getPasswordResetToken(input.token);
      if (!resetRecord) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid reset token." });
      }
      if (new Date() > resetRecord.expiresAt) {
        await db.deletePasswordResetToken(input.token);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Expired reset token. Please request again." });
      }
      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await db.updateUserPassword(resetRecord.userId, passwordHash);
      await db.deletePasswordResetToken(input.token);
      return { success: true, message: "Password changed successfully." };
    }),

  // Change Password (for logged-in users)
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This account does not support password changes." });
      }
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      }
      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await db.updateUserPassword(user.id, passwordHash);
      return { success: true, message: "Password changed successfully." };
    }),
});

export const userRouter = router({
  setRole: protectedProcedure
    .input(z.object({ platformRole: z.enum(["instructor", "student"]) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserPlatformRole(ctx.user.id, input.platformRole);
      return { success: true };
    }),
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().optional(), bio: z.string().optional(), avatarUrl: z.string().optional(), preferredLang: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

