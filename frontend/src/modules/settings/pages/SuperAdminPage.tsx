import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import apiClient from "@/lib/api";
import { PageHeader } from "@/components";
import { useUserStore } from "@/modules/auth";

type Gym = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

export default function SuperAdminPage() {
  const userProfile = useUserStore((state) => state.userProfile);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  const loadGyms = async () => {
    const response = await apiClient.get<Gym[] | { results: Gym[] }>("/accounts/gyms/");
    setGyms(Array.isArray(response.data) ? response.data : response.data.results);
  };

  useEffect(() => {
    if (userProfile?.role === "super_admin") loadGyms().catch(() => setError("Could not load gyms."));
  }, [userProfile?.role]);

  if (userProfile && userProfile.role !== "super_admin") return <Navigate to="/" replace />;

  const createGym = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await apiClient.post("/accounts/gyms/", { name, slug });
      setName("");
      setSlug("");
      await loadGyms();
    } catch {
      setError("Gym could not be created. Ensure the name and slug are unique.");
    }
  };

  const toggleGym = async (gym: Gym) => {
    await apiClient.patch(`/accounts/gyms/${gym.id}/`, { is_active: !gym.is_active });
    await loadGyms();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Super Admin" subtitle="Private platform management for all gyms and customer accounts." />
      <form onSubmit={createGym} className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-5">
        <input className="rounded border p-2" placeholder="Gym name" value={name} onChange={(event) => setName(event.target.value)} required />
        <input className="rounded border p-2" placeholder="unique-gym-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        <button className="rounded bg-primary px-4 py-2 text-white" type="submit">Add Gym</button>
      </form>
      {error && <p className="text-error">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left"><thead><tr className="border-b"><th className="p-3">Gym</th><th>Slug</th><th>Status</th><th className="p-3">Action</th></tr></thead>
          <tbody>{gyms.map((gym) => <tr key={gym.id} className="border-b"><td className="p-3">{gym.name}</td><td>{gym.slug}</td><td>{gym.is_active ? "Active" : "Disabled"}</td><td className="p-3"><button className="rounded border px-3 py-1" onClick={() => toggleGym(gym)}>{gym.is_active ? "Disable" : "Enable"}</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
