import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input, Textarea } from "@/components/ui";

import {
  useDeleteGymLogo,
  useDeleteLoginPageImage,
  useGymProfile,
  useUpdateGymProfile,
  useUploadGymLogo,
  useUploadLoginPageImage,
} from "../queries";
import type { GymProfilePayload } from "../types";

const maxLogoSizeMb = 5;
const maxLogoSizeBytes = maxLogoSizeMb * 1024 * 1024;

export default function GymInformationSettingsPage() {
  const navigate = useNavigate();
  const gymQuery = useGymProfile();
  const updateMutation = useUpdateGymProfile();
  const uploadLogoMutation = useUploadGymLogo();
  const deleteLogoMutation = useDeleteGymLogo();
  const uploadLoginImageMutation = useUploadLoginPageImage();
  const deleteLoginImageMutation = useDeleteLoginPageImage();

  const [form, setForm] = useState<GymProfilePayload>({
    gym_name: "",
    address: "",
    phone_number: "",
    email: "",
    website: "",
    description: "",
  });

  useEffect(() => {
    if (!gymQuery.data) return;
    setForm({
      gym_name: gymQuery.data.gym_name,
      address: gymQuery.data.address,
      phone_number: gymQuery.data.phone_number,
      email: gymQuery.data.email,
      website: gymQuery.data.website,
      description: gymQuery.data.description,
    });
  }, [gymQuery.data]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateMutation.mutate(form);
  };

  const getSelectedImage = (event: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = event.target.files?.[0];
    if (!file) return null;
    if (file.size > maxLogoSizeBytes) {
      toast.error(`${label} size must be ${maxLogoSizeMb}MB or less`);
      event.target.value = "";
      return null;
    }
    event.target.value = "";
    return file;
  };

  const onLogoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = getSelectedImage(event, "Logo");
    if (!file) return;
    uploadLogoMutation.mutate(file);
  };

  const onLoginImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = getSelectedImage(event, "Login page image");
    if (!file) return;
    uploadLoginImageMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gym Information Settings"
        subtitle="Manage gym profile, logo, and contact details."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
        ]}
      />

      <Card>
        <CardHeader title="Gym Profile" subtitle="This information is used across billing, cards, and printed documents." />
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Gym Name"
                value={form.gym_name}
                onChange={(e) => setForm((prev) => ({ ...prev, gym_name: e.target.value }))}
              />
              <Input
                label="Phone Number"
                value={form.phone_number}
                onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Input
                label="Website (Optional)"
                value={form.website || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              />
            </div>

            <Textarea
              label="Address"
              rows={3}
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />

            <Textarea
              label="Gym Description"
              rows={3}
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />

            <div className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending || gymQuery.isLoading}>
                Save Gym Information
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Gym Logo" subtitle={`Upload or remove gym logo for identity cards and invoices. Max ${maxLogoSizeMb}MB.`} />
        <CardContent className="space-y-4">
          {gymQuery.data?.gym_logo_url ? (
            <img
              src={gymQuery.data.gym_logo_url}
              alt="Gym logo"
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
          ) : (
            <p className="text-sm text-text-secondary">No logo uploaded.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover">
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={onLogoSelected} />
            </label>

            <Button type="button" variant="outline" onClick={() => deleteLogoMutation.mutate()} loading={deleteLogoMutation.isPending}>
              Remove Logo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Login Page Image"
          subtitle={`Upload or remove the image shown on the login page. Max ${maxLogoSizeMb}MB.`}
        />
        <CardContent className="space-y-4">
          {gymQuery.data?.login_page_image_url ? (
            <img
              src={gymQuery.data.login_page_image_url}
              alt="Login page"
              className="h-48 w-full max-w-xl rounded-lg border border-border object-cover"
            />
          ) : (
            <p className="text-sm text-text-secondary">No login page image uploaded.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover">
              Upload Login Image
              <input type="file" accept="image/*" className="hidden" onChange={onLoginImageSelected} />
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => deleteLoginImageMutation.mutate()}
              loading={deleteLoginImageMutation.isPending}
            >
              Remove Login Image
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
