import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import apiClient from "@/lib/api";
import { PageHeader } from "@/components";
import { useUserStore } from "@/modules/auth";

type Gym = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type ManagedUser = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role_name: "super_admin" | "admin" | "manager" | "staff";
  gym: number | null;
  is_active: boolean;
};

const emptyAccount = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  gym: "",
  role_name: "admin" as ManagedUser["role_name"],
};

export default function SuperAdminPage() {
  const userProfile = useUserStore((state) => state.userProfile);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [gymName, setGymName] = useState("");
  const [gymSlug, setGymSlug] = useState("");
  const [account, setAccount] = useState(emptyAccount);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", role_name: "admin" as ManagedUser["role_name"], gym: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const gymNames = useMemo(
    () => new Map(gyms.map((gym) => [gym.id, gym.name])),
    [gyms],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [gymResponse, userResponse] = await Promise.all([
        apiClient.get<Gym[] | { results: Gym[] }>("/accounts/gyms/"),
        apiClient.get<ManagedUser[] | { results: ManagedUser[] }>("/accounts/users/"),
      ]);
      setGyms(Array.isArray(gymResponse.data) ? gymResponse.data : gymResponse.data.results);
      setUsers(Array.isArray(userResponse.data) ? userResponse.data : userResponse.data.results);
      setError("");
    } catch {
      setError("Could not load gyms and accounts. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "super_admin") void loadData();
  }, [userProfile?.role]);

  if (userProfile && userProfile.role !== "super_admin") return <Navigate to="/" replace />;

  const createGym = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await apiClient.post("/accounts/gyms/", { name: gymName, slug: gymSlug });
      setGymName("");
      setGymSlug("");
      setNotice("Gym created successfully. You can now create its admin account.");
      await loadData();
    } catch {
      setError("Gym could not be created. The name and slug must be unique.");
    }
  };

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await apiClient.post("/accounts/users/", {
        ...account,
        gym: account.role_name === "super_admin" ? null : Number(account.gym),
      });
      setAccount(emptyAccount);
      setNotice("Account created successfully.");
      await loadData();
    } catch {
      setError("Account could not be created. Check the required fields and use a unique username and email.");
    }
  };

  const toggleGym = async (gym: Gym) => {
    try {
      await apiClient.patch(`/accounts/gyms/${gym.id}/`, { is_active: !gym.is_active });
      setNotice(`Gym ${gym.is_active ? "disabled" : "enabled"} successfully.`);
      await loadData();
    } catch {
      setError("Gym status could not be changed.");
    }
  };

  const toggleUser = async (user: ManagedUser) => {
    const action = user.is_active ? "deactivate" : "activate";
    try {
      await apiClient.post(`/accounts/users/${user.id}/${action}/`);
      setNotice(`Account ${user.is_active ? "disabled" : "enabled"} successfully.`);
      await loadData();
    } catch {
      setError("Account status could not be changed.");
    }
  };

  const assignUserGym = async (user: ManagedUser, gymId: string) => {
    try {
      await apiClient.patch(`/accounts/users/${user.id}/`, { gym: gymId ? Number(gymId) : null });
      setNotice("Account gym assignment updated successfully.");
      await loadData();
    } catch {
      setError("Account gym assignment could not be updated.");
    }
  };

  const openEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role_name: user.role_name,
      gym: user.gym ? String(user.gym) : "",
    });
  };

  const saveUserEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    try {
      await apiClient.patch(`/accounts/users/${editingUser.id}/`, {
        ...editForm,
        gym: editForm.role_name === "super_admin" ? null : Number(editForm.gym),
      });
      setEditingUser(null);
      setNotice("Account updated successfully.");
      await loadData();
    } catch {
      setError("Account could not be updated. Ensure an ordinary account has a gym assigned.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Super Admin" subtitle="Private platform management for gyms, administrators, and platform accounts." />
      {error && <p className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</p>}
      {notice && <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{notice}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-text-primary">Create Gym</h2>
          <p className="mt-1 text-sm text-text-secondary">Create a separate customer gym and keep its data isolated.</p>
          <form onSubmit={createGym} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-border bg-background p-2" placeholder="Gym name" value={gymName} onChange={(event) => setGymName(event.target.value)} required />
            <input className="rounded border border-border bg-background p-2" placeholder="unique-gym-slug" value={gymSlug} onChange={(event) => setGymSlug(event.target.value)} required />
            <button className="rounded bg-primary px-4 py-2 text-white sm:col-span-2" type="submit">Add Gym</button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-text-primary">Create Account</h2>
          <p className="mt-1 text-sm text-text-secondary">Give a customer gym its Admin account, or create another platform Super Admin.</p>
          <form onSubmit={createAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-border bg-background p-2" placeholder="First name" value={account.first_name} onChange={(event) => setAccount({ ...account, first_name: event.target.value })} required />
            <input className="rounded border border-border bg-background p-2" placeholder="Last name" value={account.last_name} onChange={(event) => setAccount({ ...account, last_name: event.target.value })} required />
            <input className="rounded border border-border bg-background p-2" placeholder="Username" value={account.username} onChange={(event) => setAccount({ ...account, username: event.target.value })} required />
            <input className="rounded border border-border bg-background p-2" type="email" placeholder="Email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} required />
            <input className="rounded border border-border bg-background p-2" type="password" placeholder="Temporary password" value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} required />
            <select className="rounded border border-border bg-background p-2" value={account.role_name} onChange={(event) => setAccount({ ...account, role_name: event.target.value as ManagedUser["role_name"] })}>
              <option value="admin">Gym Admin</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="super_admin">Super Admin</option>
            </select>
            {account.role_name !== "super_admin" && <select className="rounded border border-border bg-background p-2 sm:col-span-2" value={account.gym} onChange={(event) => setAccount({ ...account, gym: event.target.value })} required><option value="">Select a gym</option>{gyms.filter((gym) => gym.is_active).map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select>}
            <button className="rounded bg-primary px-4 py-2 text-white sm:col-span-2" type="submit">Create Account</button>
          </form>
        </section>
      </div>

      {editingUser && <section className="rounded-xl border border-primary/30 bg-card p-5">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-text-primary">Edit Account</h2><p className="text-sm text-text-secondary">Editing {editingUser.username}</p></div><button className="rounded border border-border px-3 py-1" onClick={() => setEditingUser(null)}>Cancel</button></div>
        <form onSubmit={saveUserEdit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="rounded border border-border bg-background p-2" placeholder="First name" value={editForm.first_name} onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })} required />
          <input className="rounded border border-border bg-background p-2" placeholder="Last name" value={editForm.last_name} onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })} required />
          <input className="rounded border border-border bg-background p-2" type="email" placeholder="Email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} required />
          <select className="rounded border border-border bg-background p-2" value={editForm.role_name} onChange={(event) => setEditForm({ ...editForm, role_name: event.target.value as ManagedUser["role_name"] })}><option value="admin">Gym Admin</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="super_admin">Super Admin</option></select>
          {editForm.role_name !== "super_admin" && <select className="rounded border border-border bg-background p-2 sm:col-span-2" value={editForm.gym} onChange={(event) => setEditForm({ ...editForm, gym: event.target.value })} required><option value="">Select a gym</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select>}
          <button className="rounded bg-primary px-4 py-2 text-white sm:col-span-2" type="submit">Save Changes</button>
        </form>
      </section>}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5"><h2 className="text-lg font-semibold text-text-primary">Gyms</h2></div>
        <table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-text-secondary"><th className="p-3">Gym</th><th>Slug</th><th>Status</th><th className="p-3">Action</th></tr></thead><tbody>{gyms.map((gym) => <tr key={gym.id} className="border-b border-border last:border-0"><td className="p-3 font-medium">{gym.name}</td><td>{gym.slug}</td><td>{gym.is_active ? "Active" : "Disabled"}</td><td className="p-3"><button className="rounded border border-border px-3 py-1" onClick={() => void toggleGym(gym)}>{gym.is_active ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5"><h2 className="text-lg font-semibold text-text-primary">Platform Accounts</h2></div>
        {loading ? <p className="p-5 text-text-secondary">Loading accounts…</p> : <table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-text-secondary"><th className="p-3">Account</th><th>Role</th><th>Gym</th><th>Status</th><th className="p-3">Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-border last:border-0"><td className="p-3"><p className="font-medium">{user.first_name} {user.last_name}</p><p className="text-text-secondary">{user.username}</p></td><td className="capitalize">{user.role_name.replace("_", " ")}</td><td>{user.role_name === "super_admin" ? "Platform" : <select className="rounded border border-border bg-background p-1" value={user.gym ?? ""} onChange={(event) => void assignUserGym(user, event.target.value)}><option value="">Unassigned</option>{gyms.map((gym) => <option key={gym.id} value={gym.id}>{gym.name}</option>)}</select>}</td><td>{user.is_active ? "Active" : "Disabled"}</td><td className="flex gap-2 p-3"><button className="rounded border border-border px-3 py-1" onClick={() => openEditUser(user)}>Edit</button><button className="rounded border border-border px-3 py-1" onClick={() => void toggleUser(user)}>{user.is_active ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table>}
      </section>
    </div>
  );
}
