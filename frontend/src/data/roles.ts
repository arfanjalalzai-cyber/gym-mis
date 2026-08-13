// MIS Roles
export const roles = [
  { name: "super_admin", value: "Super Administrator" },
  { name: "admin", value: "Administrator" },
  { name: "manager", value: "Manager" },
  { name: "staff", value: "Staff" },
  // Legacy aliases still accepted by backend.
  { name: "receptionist", value: "Manager (Legacy)" },
  { name: "viewer", value: "Staff (Legacy)" },
] as const;

export type RoleName = (typeof roles)[number]["name"];

export const getRoleNameDisplay = (role: RoleName) => {
  return roles.find((r) => r.name === role)?.value || role;
};
