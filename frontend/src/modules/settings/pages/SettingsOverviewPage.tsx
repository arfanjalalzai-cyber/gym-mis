import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";

import { SettingsOverviewGrid } from "../components";
import { settingsSections } from "../hooks";

export default function SettingsOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="System-wide configuration for gym information, users, billing, security, and maintenance."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/"),
          },
        ]}
      />

      <SettingsOverviewGrid items={settingsSections} />
    </div>
  );
}
