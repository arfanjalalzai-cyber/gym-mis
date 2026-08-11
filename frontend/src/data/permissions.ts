// MIS Permissions
export const permissions = [
  { name: "users", value: "Users" },
  { name: "members", value: "Members" },
  { name: "staff", value: "Staff" },
  { name: "inventory", value: "Inventory" },
  { name: "schedule", value: "Schedule" },
  { name: "attendance", value: "Attendance" },
  { name: "fees", value: "Payments and Billing" },
  { name: "reports", value: "Reports" },
  { name: "settings", value: "Settings" },
  { name: "cards", value: "Cards" },
] as const;

export type Permission = (typeof permissions)[number]["name"];

export const routePermissions: Record<string, Permission | Permission[]> = {
  "/members": "members",
  "/members/new": "members",
  "/members/:id": "members",
  "/members/:id/edit": "members",
  "/members/:id/card": "members",
  "/staff": "staff",
  "/staff/new": "staff",
  "/staff/:id": "staff",
  "/staff/:id/edit": "staff",
  "/staff/:id/card": "staff",
  "/inventory": "inventory",
  "/inventory/new": "inventory",
  "/inventory/:id": "inventory",
  "/inventory/:id/edit": "inventory",
  "/inventory/:id/history": "inventory",
  "/schedule": "schedule",
  "/schedule/classes": "schedule",
  "/schedule/new": "schedule",
  "/schedule/:id/edit": "schedule",
  "/attendance": "attendance",
  "/attendance/report": "attendance",
  "/payments": "fees",
  "/billing": "fees",
  "/billing/:id": "fees",
  "/reports": "reports",
  "/expenses": "reports",
  "/settings": "settings",
  "/settings/gym-information": "settings",
  "/settings/user-role-management": "users",
  "/settings/membership-plans": "settings",
  "/settings/payment-billing": "settings",
  "/settings/notifications": "settings",
  "/settings/security": "settings",
  "/settings/system-preferences": "settings",
  "/settings/backup-maintenance": "settings",
};

const normalizePath = (route: string) => route.replace(/\/+$/, "") || "/";

const routeMatches = (pattern: string, route: string) => {
  const patternParts = normalizePath(pattern).split("/");
  const routeParts = normalizePath(route).split("/");
  if (patternParts.length !== routeParts.length) return false;
  return patternParts.every((segment, index) => {
    if (segment.startsWith(":")) return true;
    return segment === routeParts[index];
  });
};

export const hasRoutePermission = (route: string, userPermissions: Permission[]) => {
  const direct = routePermissions[normalizePath(route)];
  const matched =
    direct ??
    Object.entries(routePermissions).find(([pattern]) => routeMatches(pattern, route))?.[1];

  if (matched === undefined) return true;

  const requiredPermissions = Array.isArray(matched) ? matched : [matched];
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
};
