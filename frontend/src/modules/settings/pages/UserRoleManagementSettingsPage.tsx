import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/ui";
import { useUserStore } from "@/modules/auth";

import { RolePermissionMatrix } from "../components";
import { useSystemPreferenceFormatters } from "../hooks";
import {
  useChangeManagedUserPassword,
  useCreateSettingsUser,
  useDisableSettingsUser,
  useEnableSettingsUser,
  useModulesActions,
  useRoles,
  useSettingsUsers,
  useUpdateSettingsUser,
  useUpdateRolePermissions,
} from "../queries";
import type {
  RolePermissionAssignment,
  SettingsUser,
  SettingsRoleName,
  SettingsUserCreatePayload,
  SettingsUserUpdatePayload,
} from "../types";

const roleOptions: SettingsRoleName[] = ["admin", "manager", "staff"];

const emptyCreateUserForm: SettingsUserCreatePayload = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  phone: "",
  role_name: "staff",
  password: "",
};

const emptyEditUserForm: SettingsUserUpdatePayload = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  phone: "",
  role_name: "staff",
};

export default function UserRoleManagementSettingsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<SettingsRoleName | undefined>(undefined);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<SettingsUserCreatePayload>(emptyCreateUserForm);
  const [roleToEdit, setRoleToEdit] = useState<SettingsRoleName>("manager");
  const [matrixValue, setMatrixValue] = useState<RolePermissionAssignment[]>([]);
  const [passwordResetUserId, setPasswordResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState<SettingsUserUpdatePayload>(emptyEditUserForm);
  const currentUser = useUserStore((state) => state.userProfile);
  const isAdmin = currentUser?.role === "admin";
  const { formatDateTime } = useSystemPreferenceFormatters();

  const usersQuery = useSettingsUsers({ page, search: search || undefined, role: roleFilter });
  const rolesQuery = useRoles(isAdmin);
  const modulesQuery = useModulesActions(isAdmin);

  const createUserMutation = useCreateSettingsUser();
  const updateUserMutation = useUpdateSettingsUser(editUserId || 0);
  const disableUserMutation = useDisableSettingsUser();
  const enableUserMutation = useEnableSettingsUser();
  const updateRolePermissionsMutation = useUpdateRolePermissions(roleToEdit);

  const roleData = useMemo(
    () => rolesQuery.data?.find((item) => item.name === roleToEdit),
    [rolesQuery.data, roleToEdit]
  );

  useEffect(() => {
    if (roleData) {
      setMatrixValue(roleData.permissions);
    }
  }, [roleData]);

  const changePasswordMutation = useChangeManagedUserPassword(passwordResetUserId || 0);

  const users = usersQuery.data?.results ?? [];
  const total = usersQuery.data?.count ?? 0;

  const openRoleEditor = (roleName: SettingsRoleName) => setRoleToEdit(roleName);

  const handleCreateUser = (event: React.FormEvent) => {
    event.preventDefault();
    createUserMutation.mutate(createUserForm, {
      onSuccess: () => {
        setCreateUserOpen(false);
        setCreateUserForm(emptyCreateUserForm);
      },
    });
  };

  const handleChangePassword = () => {
    if (!passwordResetUserId || !newPassword.trim()) return;
    changePasswordMutation.mutate(
      { new_password: newPassword },
      {
        onSuccess: () => {
          setPasswordResetUserId(null);
          setNewPassword("");
        },
      }
    );
  };

  const openEditUser = (user: SettingsUser) => {
    setEditUserId(user.id);
    setEditUserForm({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role_name: user.role_name,
    });
  };

  const handleEditUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editUserId) return;
    updateUserMutation.mutate(editUserForm, {
      onSuccess: () => {
        setEditUserId(null);
        setEditUserForm(emptyEditUserForm);
      },
    });
  };

  const handleDeleteUser = (userId: number) => {
    const confirmed = window.confirm("Delete this user? This will disable the account.");
    if (!confirmed) return;
    disableUserMutation.mutate(userId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Role Management"
        subtitle="Create users, assign roles, and manage role-based permissions."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
          {
            label: "Create User",
            onClick: () => setCreateUserOpen(true),
          },
        ]}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" className="max-w-sm" />
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={roleFilter ?? ""}
            onChange={(e) => setRoleFilter((e.target.value || undefined) as SettingsRoleName | undefined)}
          >
            <option value="">All Roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={() => usersQuery.refetch()}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="System Users" subtitle={`Total users: ${total}`} />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last Login</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{`${user.first_name} ${user.last_name}`.trim()}</td>
                    <td className="py-2 pr-4">{user.username}</td>
                    <td className="py-2 pr-4 capitalize">{user.role_name}</td>
                    <td className="py-2 pr-4">{user.is_active ? "Active" : "Disabled"}</td>
                    <td className="py-2 pr-4">{user.last_login ? formatDateTime(user.last_login) : "-"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditUser(user)}>
                          Edit
                        </Button>
                        {user.is_active ? (
                          <Button type="button" size="sm" variant="danger" onClick={() => handleDeleteUser(user.id)}>
                            Delete
                          </Button>
                        ) : (
                          <Button type="button" size="sm" variant="outline" onClick={() => enableUserMutation.mutate(user.id)}>
                            Enable
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" onClick={() => setPasswordResetUserId(user.id)}>
                          Change Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={users.length === 0 || users.length < 25}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader title="Role-Based Access Control" subtitle="Select a role and update module-action permissions." />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((role) => (
                <Button key={role} type="button" variant={roleToEdit === role ? "primary" : "outline"} onClick={() => openRoleEditor(role)}>
                  {role}
                </Button>
              ))}
            </div>

            <RolePermissionMatrix
              roleName={roleToEdit}
              modules={modulesQuery.data ?? []}
              value={matrixValue}
              onChange={setMatrixValue}
              onSave={() => updateRolePermissionsMutation.mutate(matrixValue)}
              saving={updateRolePermissionsMutation.isPending}
              loading={rolesQuery.isLoading || modulesQuery.isLoading}
            />
          </CardContent>
        </Card>
      )}

      {createUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader title="Create User" />
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateUser}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="First Name"
                    value={createUserForm.first_name}
                    onChange={(e) => setCreateUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                  <Input
                    label="Last Name"
                    value={createUserForm.last_name}
                    onChange={(e) => setCreateUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
                <Input
                  label="Username"
                  value={createUserForm.username}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  label="Phone"
                  value={createUserForm.phone || ""}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <Input
                  label="Password"
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Role</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={createUserForm.role_name}
                    onChange={(e) => setCreateUserForm((prev) => ({ ...prev, role_name: e.target.value as SettingsRoleName }))}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={createUserMutation.isPending}>
                    Create
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {editUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader title="Edit User" />
            <CardContent>
              <form className="space-y-4" onSubmit={handleEditUser}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="First Name"
                    value={editUserForm.first_name || ""}
                    onChange={(e) => setEditUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                  <Input
                    label="Last Name"
                    value={editUserForm.last_name || ""}
                    onChange={(e) => setEditUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
                <Input
                  label="Username"
                  value={editUserForm.username || ""}
                  onChange={(e) => setEditUserForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  value={editUserForm.email || ""}
                  onChange={(e) => setEditUserForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  label="Phone"
                  value={editUserForm.phone || ""}
                  onChange={(e) => setEditUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Role</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={editUserForm.role_name || "staff"}
                    onChange={(e) =>
                      setEditUserForm((prev) => ({ ...prev, role_name: e.target.value as SettingsRoleName }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditUserId(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={updateUserMutation.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {passwordResetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader title="Change User Password" />
            <CardContent className="space-y-4">
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPasswordResetUserId(null)}>
                  Cancel
                </Button>
                <Button type="button" loading={changePasswordMutation.isPending} onClick={handleChangePassword}>
                  Save Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
