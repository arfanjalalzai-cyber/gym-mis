import { z } from "zod";

/**
 * Forgot Password Schema
 * Accepts either email or username
 */
export const forgotPasswordSchema = z.object({
  email_or_username: z
    .string()
    .min(1, "Email or username is required")
    .refine(
      (val) => {
        // Accept either email format or username
        if (val.includes("@")) {
          return z.string().email().safeParse(val).success;
        }
        return val.length >= 3;
      },
      {
        message: "Invalid email or username format",
      }
    ),
});

/**
 * Verify Reset Code Schema
 * Validates 6-digit verification code
 */
export const verifyResetCodeSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only numbers"),
});

/**
 * Reset Password Schema (for form only - code comes from navigation state)
 * Validates password strength and confirmation
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Verify Email Schema
 * Validates verification token
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Invalid verification token"),
});

/**
 * Sign Up Schema
 * Validates account creation form
 */
const signUpBaseSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || /^07\d{8}$/.test(value), {
      message: "Phone must start with 07 and be 10 digits",
    }),
  roleName: z.enum(["admin", "manager", "staff"], {
    required_error: "User position is required",
  }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

export const adminPasswordSchema = z.object({
  adminPassword: z.string().min(1, "Admin password is required"),
});

export const signUpDetailsSchema = signUpBaseSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export const signUpSchema = signUpBaseSchema
  .extend({
    adminPassword: z.string().min(1, "Admin password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Enhanced Login Schema
 * Includes rate limiting support
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be at most 50 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
  rememberMe: z.boolean().optional(),
});

// Type exports for TypeScript
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type AdminPasswordInput = z.infer<typeof adminPasswordSchema>;
export type SignUpDetailsInput = z.infer<typeof signUpDetailsSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
