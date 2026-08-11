import { useEffect, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  useSignUp,
  useVerifyAdminPassword,
} from "@/modules/auth/api/useAuthMutations";
import {
  adminPasswordSchema,
  signUpDetailsSchema,
  type AdminPasswordInput,
  type SignUpDetailsInput,
} from "@/modules/auth/schemas/authSchemas";
import { useGymBranding } from "@/modules/settings/hooks";

const darkInputClass =
  "h-14 rounded-xl border-white/15 bg-auth-background/35 text-base text-white placeholder:text-auth-muted focus:border-primary focus:ring-primary/25";

export default function SignUpPage() {
  const { t } = useTranslation();
  const signUpMutation = useSignUp();
  const verifyAdminPasswordMutation = useVerifyAdminPassword();
  const { gymName, gymLogoUrl, loginPageImageUrl } = useGymBranding();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedAdminPassword, setVerifiedAdminPassword] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] =
    useState("/images/user.jpeg");

  useEffect(() => {
    return () => {
      if (profilePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreviewUrl);
      }
    };
  }, [profilePreviewUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpDetailsInput>({
    resolver: zodResolver(signUpDetailsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      roleName: "staff",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    register: registerAdminPassword,
    handleSubmit: handleAdminPasswordSubmit,
    formState: { errors: adminPasswordErrors },
  } = useForm<AdminPasswordInput>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: {
      adminPassword: "",
    },
  });

  const onVerifyAdminPassword = async (data: AdminPasswordInput) => {
    await verifyAdminPasswordMutation.mutateAsync({
      admin_password: data.adminPassword,
    });
    setVerifiedAdminPassword(data.adminPassword);
  };

  const onSubmit = async (data: SignUpDetailsInput) => {
    if (!verifiedAdminPassword) {
      toast.error(
        t(
          "auth.verifyAdminPasswordFirst",
          "Please verify the admin password first."
        )
      );
      return;
    }

    await signUpMutation.mutateAsync({
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      username: data.username.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
      profile_picture: profilePicture || undefined,
      password: data.password,
      confirm_password: data.confirmPassword,
      admin_password: verifiedAdminPassword,
      role_name: data.roleName,
    });
  };

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be smaller than 5MB.");
      return;
    }

    if (profilePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(profilePreviewUrl);
    }

    setProfilePicture(file);
    setProfilePreviewUrl(URL.createObjectURL(file));
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

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 lg:justify-end lg:px-12 xl:px-20">
        <section className="max-h-[calc(100vh-32px)] w-full max-w-[760px] overflow-y-auto rounded-3xl border border-white/15 bg-auth-card/80 px-5 py-6 shadow-[0_0_42px_rgba(13,148,136,0.24)] backdrop-blur-xl sm:px-8">
          <div className="mb-6 flex flex-col items-center gap-4 border-b border-white/10 pb-5 text-center sm:flex-row sm:text-left">
            <div className="flex justify-center">
              {gymLogoUrl ? (
                <img
                  src={gymLogoUrl}
                  alt="GYM-MIS Logo"
                  className="h-16 w-16 rounded-2xl object-contain drop-shadow-[0_0_22px_rgba(13,148,136,0.65)]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-lg font-black text-primary">
                  GYM
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide sm:text-3xl">
                {gymName.split(" ")[0] || "GYM"}{" "}
                <span className="text-primary">MIS</span>
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase text-auth-muted">
                Management System
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              {verifiedAdminPassword ? (
                <UserPlus className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                {verifiedAdminPassword ? "Create" : "Admin"}{" "}
                <span className="text-primary">
                  {verifiedAdminPassword ? "Account" : "Access"}
                </span>
              </h2>
              <p className="mt-1 text-sm text-auth-muted">
                {verifiedAdminPassword
                  ? t(
                      "auth.signUpDescription",
                      "Fill in your details to create a new account"
                    )
                  : t(
                      "auth.adminPasswordGateDescription",
                      "Enter the admin password to continue account creation"
                    )}
              </p>
            </div>
          </div>

          {!verifiedAdminPassword ? (
            <form
              onSubmit={handleAdminPasswordSubmit(onVerifyAdminPassword)}
              className="space-y-5"
            >
              <Input
                type="password"
                placeholder={t(
                  "auth.adminPasswordPlaceholder",
                  "Enter admin password"
                )}
                error={adminPasswordErrors.adminPassword?.message}
                autoComplete="current-password"
                leftIcon={<ShieldCheck className="h-5 w-5 text-white" />}
                className={darkInputClass}
                {...registerAdminPassword("adminPassword")}
              />

              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-white">
                {t(
                  "auth.adminPasswordHint",
                  "Only an admin can create new accounts"
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={verifyAdminPasswordMutation.isPending}
                leftIcon={<ShieldCheck className="h-5 w-5" />}
                className="h-14 rounded-xl bg-gradient-to-r from-primary to-secondary text-base font-bold uppercase shadow-[0_0_24px_rgba(13,148,136,0.34)] hover:brightness-110"
              >
                {verifyAdminPasswordMutation.isPending
                  ? t("auth.verifyingAdminPassword", "Verifying...")
                  : t("auth.continue", "Continue")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-primary/20 bg-primary/10 p-5 text-center">
                  <img
                    src={profilePreviewUrl}
                    alt="Selected profile"
                    className="h-24 w-24 rounded-full border-2 border-primary/40 object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t("auth.profilePicture", "Profile Picture")}
                    </p>
                    <p className="mt-1 text-xs text-auth-muted">
                      JPG or PNG, max 5MB
                    </p>
                  </div>
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/10">
                    <Camera className="h-4 w-4" />
                    Add Profile Picture
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2">
                <Input
                  placeholder={t("auth.firstNamePlaceholder", "Enter first name")}
                  error={errors.firstName?.message}
                  autoComplete="given-name"
                  leftIcon={<User className="h-5 w-5 text-white" />}
                  className={darkInputClass}
                  {...register("firstName")}
                />
                <Input
                  placeholder={t("auth.lastNamePlaceholder", "Enter last name")}
                  error={errors.lastName?.message}
                  autoComplete="family-name"
                  leftIcon={<User className="h-5 w-5 text-white" />}
                  className={darkInputClass}
                  {...register("lastName")}
                />

                <Input
                  placeholder={t("auth.usernamePlaceholder", "Choose a username")}
                  error={errors.username?.message}
                  autoComplete="username"
                  leftIcon={<User className="h-5 w-5 text-white" />}
                  className={darkInputClass}
                  {...register("username")}
                />

                <Input
                  type="email"
                  placeholder={t("auth.emailPlaceholder", "Enter your email")}
                  error={errors.email?.message}
                  autoComplete="email"
                  leftIcon={<Mail className="h-5 w-5 text-white" />}
                  className={darkInputClass}
                  {...register("email")}
                />

                <Input
                  placeholder={t("auth.phonePlaceholder", "07XXXXXXXX")}
                  error={errors.phone?.message}
                  autoComplete="tel"
                  leftIcon={<Phone className="h-5 w-5 text-white" />}
                  className={darkInputClass}
                  {...register("phone")}
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    {t("auth.userPosition", "User Position")}
                  </label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white" />
                    <select
                      className={`h-14 w-full rounded-xl border bg-auth-background/35 px-4 py-2.5 pl-10 text-base text-white transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${
                        errors.roleName
                          ? "border-error focus:border-error focus:ring-error/20"
                          : "border-white/15"
                      }`}
                      {...register("roleName")}
                    >
                      <option className="bg-auth-background" value="staff">
                        {t("auth.roleStaff", "Staff")}
                      </option>
                      <option className="bg-auth-background" value="manager">
                        {t("auth.roleManager", "Manager")}
                      </option>
                      <option className="bg-auth-background" value="admin">
                        {t("auth.roleAdmin", "Admin")}
                      </option>
                    </select>
                  </div>
                  {errors.roleName && (
                    <p className="mt-1.5 text-sm text-error">
                      {errors.roleName.message}
                    </p>
                  )}
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder", "Create a password")}
                  error={errors.password?.message}
                  autoComplete="new-password"
                  leftIcon={<Lock className="h-5 w-5 text-white" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-auth-muted transition-colors hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                  className={darkInputClass}
                  {...register("password")}
                />

                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t(
                    "auth.confirmPasswordPlaceholder",
                    "Confirm your password"
                  )}
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                  leftIcon={<Lock className="h-5 w-5 text-white" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="text-auth-muted transition-colors hover:text-white"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                  className={darkInputClass}
                  {...register("confirmPassword")}
                />
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={signUpMutation.isPending}
                leftIcon={<UserPlus className="h-5 w-5" />}
                className="h-14 rounded-xl bg-gradient-to-r from-primary to-secondary text-base font-bold uppercase shadow-[0_0_24px_rgba(13,148,136,0.34)] hover:brightness-110"
              >
                {signUpMutation.isPending
                  ? t("auth.creatingAccount", "Creating account...")
                  : t("auth.signUpButton", "Sign Up")}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-auth-muted">
            <span>{t("auth.alreadyHaveAccount", "Already have an account?")} </span>
            <Link
              to="/auth/login"
              className="font-semibold text-primary hover:text-primary-dark"
            >
              {t("auth.login", "Sign In")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
