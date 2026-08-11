import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Mail, Clock } from "lucide-react";
import Alert from "@/components/ui/Alert";

interface AccountLockedMessageProps {
  lockedUntil: string;
  onUnlocked?: () => void;
}

/**
 * Account Locked Message Component
 * Displays account lockout information after failed login attempts
 *
 * @param lockedUntil - ISO timestamp when account will be unlocked
 */
export default function AccountLockedMessage({
  lockedUntil,
  onUnlocked,
}: AccountLockedMessageProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Calculate time remaining
  const unlockTime = new Date(lockedUntil);
  const remainingMs = unlockTime.getTime() - now.getTime();
  const minutesRemaining = Math.max(
    0,
    Math.ceil(remainingMs / (1000 * 60))
  );

  useEffect(() => {
    if (remainingMs <= 0) {
      onUnlocked?.();
    }
  }, [remainingMs, onUnlocked]);

  return (
    <Alert variant="error" className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold">
            {t("auth.accountLocked", "Account Temporarily Locked")}
          </h4>
          <p className="text-sm">
            {t(
              "auth.accountLockedMessage",
              "Your account has been temporarily locked due to multiple failed login attempts."
            )}
          </p>

          {/* Time Remaining */}
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>
              {minutesRemaining > 0
                ? t(
                    minutesRemaining === 1
                      ? "auth.tryAgainInOne"
                      : "auth.tryAgainIn",
                    minutesRemaining === 1
                      ? "Try again in {{count}} minute"
                      : "Try again in {{count}} minutes",
                    { count: minutesRemaining }
                  )
                : t("auth.tryAgainNow", "You can try signing in now.")}
            </span>
          </div>

          {/* Help Links */}
          <div className="flex flex-col gap-2 border-t border-error/20 pt-3 text-sm">
            <Link
              to="/mis/forgot-password"
              className="inline-flex items-center gap-2 font-medium hover:underline"
            >
              <Mail className="h-4 w-4" />
              {t("auth.forgotPassword", "Forgot Password?")}
            </Link>
            <p className="text-sm opacity-90">
              {t(
                "auth.contactSupport",
                "If you need immediate access, please contact support."
              )}
            </p>
          </div>
        </div>
      </div>
    </Alert>
  );
}
