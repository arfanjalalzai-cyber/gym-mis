import { Settings, Shield, Globe, Database, Users, CreditCard, Building2 } from "lucide-react";

export interface SettingsSectionItem {
  key: string;
  title: string;
  description: string;
  icon: typeof Settings;
  path: string;
}

export const settingsSections: SettingsSectionItem[] = [
  {
    key: "gym-information",
    title: "Gym Information",
    description: "Gym profile, contact, logo, and working hours",
    icon: Building2,
    path: "/settings/gym-information",
  },
  {
    key: "user-role-management",
    title: "User & Role Management",
    description: "Users, role assignments, and permission matrix",
    icon: Users,
    path: "/settings/user-role-management",
  },
  {
    key: "membership-plans",
    title: "Membership Plans",
    description: "Global templates for Basic, Premium, and VIP plans",
    icon: Settings,
    path: "/settings/membership-plans",
  },
  {
    key: "payment-billing",
    title: "Payment & Billing",
    description: "Currency, tax, payment methods, and invoice format",
    icon: CreditCard,
    path: "/settings/payment-billing",
  },
  {
    key: "security",
    title: "Security",
    description: "Password policy, login limits, and activity logs",
    icon: Shield,
    path: "/settings/security",
  },
  {
    key: "system-preferences",
    title: "System Preferences",
    description: "Date/time formats and timezone",
    icon: Globe,
    path: "/settings/system-preferences",
  },
  {
    key: "backup-maintenance",
    title: "Backup & Maintenance",
    description: "Manual backup, restore, schedule, and system logs",
    icon: Database,
    path: "/settings/backup-maintenance",
  },
];
