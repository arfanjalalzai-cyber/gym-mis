import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  loginSchema,
  type LoginFormInputs,
} from "@/schemas/loginPageValidation";
import { useUserStore } from "@/modules/auth/stores/useUserStore";
import { AccountLockedMessage } from "@/modules/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import axios, { AxiosError } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const authInputClass =
  "auth-login-input h-12 rounded-xl border-white/25 !bg-[#10282c] text-base !text-white placeholder:text-slate-300 shadow-inner shadow-black/20 focus:border-primary focus:ring-primary/25";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [gymLogoUrl, setGymLogoUrl] = useState<string | null>(null);
  const [loginPageImageUrl, setLoginPageImageUrl] = useState<string | null>(
    null
  );
  const [showLogoFallback, setShowLogoFallback] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null
  );
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const {
    login,
    loading,
    error,
    clearError,
    lockedUntil: storeLockedUntil,
  } = useUserStore();

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    "/";

  useEffect(() => {
    let isMounted = true;

    axios
      .get(`${API_BASE_URL}/core/initialize`)
      .then((response) => {
        const logo = response.data?.settings?.logo_settings?.logo;
        const loginImage =
          response.data?.settings?.login_page_image_settings?.login_page_image;

        if (isMounted && typeof logo === "string" && logo.trim()) {
          setGymLogoUrl(logo);
          setShowLogoFallback(false);
        }

        if (isMounted && typeof loginImage === "string" && loginImage.trim()) {
          setLoginPageImageUrl(loginImage);
        }
      })
      .catch(() => {
        if (isMounted) setShowLogoFallback(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    clearError();
    setAttemptsRemaining(null);
    setIsLocked(false);
    setLockedUntil(null);

    try {
      await login(data);
      toast.success(t("auth.loginSuccess", "Welcome back!"));
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof AxiosError) {
        if (
          err?.response?.status === 429 ||
          err?.response?.data?.locked_until
        ) {
          setIsLocked(true);
          setLockedUntil(err?.response?.data?.locked_until || storeLockedUntil);
          toast.error(t("auth.accountLocked", "Account is temporarily locked"));
        } else if (err?.response?.data?.attempts_remaining !== undefined) {
          const remaining = err.response.data.attempts_remaining;
          setAttemptsRemaining(remaining);
          if (remaining > 0) {
            toast.error(
              t("auth.attemptsRemaining", "{{count}} attempts remaining", {
                count: remaining,
              })
            );
          }
        } else {
          toast.error(
            error || t("auth.loginError", "Invalid username or password")
          );
        }
      }
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(45,212,191,0.24),transparent_28%),linear-gradient(90deg,rgba(6,19,22,0.46),rgba(6,19,22,0.88)_58%,rgba(6,19,22,0.96))]" />
      <div className="absolute inset-0 bg-black/35" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-4 lg:justify-end lg:px-12 xl:px-20">
        <section className="w-full max-w-[410px] rounded-[24px] border border-white/15 bg-auth-card/80 px-6 py-5 shadow-[0_0_42px_rgba(13,148,136,0.24)] backdrop-blur-xl sm:px-8">
          <div className="mb-5 text-center">
            <div className="mb-3 flex items-center justify-center">
              {gymLogoUrl && !showLogoFallback ? (
                <img
                  src={gymLogoUrl}
                  alt="GYM-MIS Logo"
                  className="h-16 w-16 rounded-2xl object-contain drop-shadow-[0_0_22px_rgba(13,148,136,0.65)]"
                  onError={() => setShowLogoFallback(true)}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-lg font-black text-primary shadow-[0_0_24px_rgba(13,148,136,0.45)]">
                  GYM
                </div>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-wide">
              GYM <span className="text-primary">MIS</span>
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-auth-muted">
              Management System
            </p>
          </div>

          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold">
              Welcome <span className="text-primary">Back!</span>
            </h2>
            <p className="mt-1 text-sm text-auth-muted">
              Sign in to continue to your account
            </p>
          </div>

          {isLocked && lockedUntil && (
            <div className="mb-5">
              <AccountLockedMessage
                lockedUntil={lockedUntil}
                onUnlocked={() => {
                  setIsLocked(false);
                  setLockedUntil(null);
                }}
              />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              placeholder={t("auth.username", "Username")}
              error={errors.username?.message}
              autoComplete="username"
              disabled={isLocked}
              leftIcon={<User className="h-5 w-5 text-white" />}
              className={authInputClass}
              {...register("username")}
            />

            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.password", "Password")}
              error={errors.password?.message}
              autoComplete="current-password"
              disabled={isLocked}
              leftIcon={<Lock className="h-5 w-5 text-white" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-auth-muted transition-colors hover:text-white"
                  tabIndex={-1}
                  disabled={isLocked}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              }
              className={authInputClass}
              {...register("password")}
            />

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-3 text-white">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-5 w-5 rounded border-primary/40 bg-auth-background accent-primary"
                />
                Remember me
              </label>
              <Link
                to="/auth/forgot-password"
                className="font-medium text-primary hover:text-primary-dark"
              >
                Forgot Password?
              </Link>
            </div>

            {error && !isLocked && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p>{error}</p>
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <p className="mt-1 font-medium">
                      {t(
                        "auth.attemptsRemaining",
                        "{{count}} attempts remaining",
                        { count: attemptsRemaining }
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={isLocked}
              leftIcon={
                isLocked ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )
              }
              className="h-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-base font-bold uppercase shadow-[0_0_24px_rgba(13,148,136,0.34)] hover:brightness-110"
            >
              {isLocked
                ? t("auth.accountLocked", "Account Locked")
                : loading
                ? t("auth.loggingIn", "Signing in...")
                : "Sign In"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-5 text-sm text-auth-muted">
            <div className="h-px flex-1 bg-white/15" />
            <span>OR</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-transparent text-base font-bold uppercase text-white transition-colors hover:border-primary/60 hover:bg-primary/10"
          >
            <ShieldCheck className="h-5 w-5" />
            Admin Login
          </button>

          <div className="mt-4 text-center text-sm text-auth-muted">
            <span>Don't have an account? </span>
            <Link
              to="/auth/signup"
              className="font-semibold text-primary hover:text-primary-dark"
            >
              Sign Up
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-auth-muted">
            © 2026 <span className="text-primary">Gym MIS</span>. All rights
            reserved.
          </p>
        </section>
      </main>
    </div>
  );
}
