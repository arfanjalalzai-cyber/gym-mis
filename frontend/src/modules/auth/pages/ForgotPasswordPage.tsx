import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";

import {
  forgotPasswordSchema,
  verifyResetCodeSchema,
  type ForgotPasswordInput,
  type VerifyResetCodeInput,
} from "../schemas/authSchemas";
import {
  useForgotPassword,
  useVerifyResetCode,
} from "../api/useAuthMutations";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import OTPInput from "../components/OTPInput";
import { useGymBranding } from "@/modules/settings/hooks";

type Step = "email" | "code" | "reset";
const authInputClass =
  "h-14 rounded-xl border-white/15 bg-auth-background/35 text-base text-white placeholder:text-auth-muted focus:border-primary focus:ring-primary/25";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gymName, gymLogoUrl, loginPageImageUrl } = useGymBranding();
  const [step, setStep] = useState<Step>("email");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const forgotPasswordMutation = useForgotPassword();
  const verifyCodeMutation = useVerifyResetCode();

  const emailForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const codeForm = useForm<VerifyResetCodeInput>({
    resolver: zodResolver(verifyResetCodeSchema),
  });

  const onEmailSubmit = async (data: ForgotPasswordInput) => {
    try {
      const response = await forgotPasswordMutation.mutateAsync(data);
      if (response.data.success) {
        setEmailOrUsername(data.email_or_username);
        setMaskedEmail(response.data.masked_email || "");
        setStep("code");
      }
    } catch {
      // Error handled by mutation.
    }
  };

  const onCodeSubmit = async (data: VerifyResetCodeInput) => {
    try {
      const response = await verifyCodeMutation.mutateAsync({
        email_or_username: emailOrUsername,
        code: data.code,
      });

      if (response.data.success) {
        navigate("/auth/reset-password", {
          state: { emailOrUsername, code: data.code },
        });
      }
    } catch {
      // Error handled by mutation.
    }
  };

  const handleOTPComplete = async (code: string) => {
    try {
      const response = await verifyCodeMutation.mutateAsync({
        email_or_username: emailOrUsername,
        code,
      });

      if (response.data.success) {
        navigate("/auth/reset-password", {
          state: { emailOrUsername, code },
        });
      }
    } catch {
      // Error handled by mutation.
    }
  };

  const handleResendCode = async () => {
    try {
      await forgotPasswordMutation.mutateAsync({
        email_or_username: emailOrUsername,
      });
      codeForm.reset();
    } catch {
      // Error handled by mutation.
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-auth-background text-white"
      style={
        loginPageImageUrl
          ? {
              backgroundImage: `url(${loginPageImageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(45,212,191,0.24),transparent_28%),linear-gradient(90deg,rgba(6,19,22,0.50),rgba(6,19,22,0.86)_58%,rgba(6,19,22,0.96))]" />
      <div className="absolute inset-0 bg-black/35" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 lg:justify-end lg:px-16 xl:px-24">
        <section className="w-full max-w-[430px] rounded-[28px] border border-white/15 bg-auth-card/80 px-7 py-8 shadow-[0_0_42px_rgba(13,148,136,0.24)] backdrop-blur-xl sm:px-10">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              {gymLogoUrl ? (
                <img
                  src={gymLogoUrl}
                  alt="GYM-MIS Logo"
                  className="h-20 w-20 rounded-2xl object-contain drop-shadow-[0_0_22px_rgba(13,148,136,0.65)]"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-xl font-black text-primary">
                  GYM
                </div>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-wide">
              {gymName.split(" ")[0] || "GYM"}{" "}
              <span className="text-primary">MIS</span>
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.45em] text-auth-muted">
              Management System
            </p>
          </div>

          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              {step === "email" ? (
                <Mail className="h-7 w-7" />
              ) : (
                <KeyRound className="h-7 w-7" />
              )}
            </div>
            <h2 className="text-3xl font-bold">
              {step === "email" ? "Reset" : "Verify"}{" "}
              <span className="text-primary">
                {step === "email" ? "Password" : "Code"}
              </span>
            </h2>
            <p className="mt-2 text-sm text-auth-muted">
              {step === "email"
                ? t(
                    "auth.forgotPasswordSubtitle",
                    "Enter your email or username to receive a verification code"
                  )
                : t(
                    "auth.verifyCodeSubtitle",
                    "Enter the 6-digit code sent to {{email}}",
                    { email: maskedEmail }
                  )}
            </p>
          </div>

          {step === "email" ? (
            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="space-y-5"
            >
              <Input
                type="text"
                placeholder={t(
                  "auth.emailOrUsernamePlaceholder",
                  "Enter your email or username"
                )}
                leftIcon={<Mail className="h-5 w-5 text-white" />}
                error={emailForm.formState.errors.email_or_username?.message}
                className={authInputClass}
                {...emailForm.register("email_or_username")}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={forgotPasswordMutation.isPending}
                className="h-14 rounded-xl bg-gradient-to-r from-primary to-secondary text-base font-bold uppercase shadow-[0_0_24px_rgba(13,148,136,0.34)] hover:brightness-110"
              >
                {t("auth.sendCode", "Send Verification Code")}
              </Button>

              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("auth.backToLogin", "Back to Login")}
                </Link>
              </div>
            </form>
          ) : (
            <form
              onSubmit={codeForm.handleSubmit(onCodeSubmit)}
              className="space-y-5"
            >
              <div>
                <label className="mb-3 block text-sm font-medium text-white">
                  {t("auth.verificationCode", "Verification Code")}
                </label>
                <OTPInput
                  length={6}
                  value={codeForm.watch("code") || ""}
                  onChange={(value) => codeForm.setValue("code", value)}
                  onComplete={handleOTPComplete}
                  disabled={verifyCodeMutation.isPending}
                  error={codeForm.formState.errors.code?.message}
                />
              </div>

              <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                <p className="font-medium">
                  {t("auth.codeExpiresIn", "Code expires in 15 minutes")}
                </p>
                <p className="mt-1 text-xs text-amber-100/80">
                  {t(
                    "auth.codeFiveAttempts",
                    "You have 5 attempts to enter the correct code"
                  )}
                </p>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={verifyCodeMutation.isPending}
                className="h-14 rounded-xl bg-gradient-to-r from-primary to-secondary text-base font-bold uppercase shadow-[0_0_24px_rgba(13,148,136,0.34)] hover:brightness-110"
              >
                {t("auth.verifyCode", "Verify Code")}
              </Button>

              <div className="space-y-3 text-center text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={forgotPasswordMutation.isPending}
                  className="font-medium text-primary hover:text-primary-dark disabled:opacity-50"
                >
                  {t("auth.resendCode", "Resend Code")}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      codeForm.reset();
                    }}
                    className="inline-flex items-center gap-2 text-auth-muted hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("auth.changeEmail", "Change Email/Username")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
