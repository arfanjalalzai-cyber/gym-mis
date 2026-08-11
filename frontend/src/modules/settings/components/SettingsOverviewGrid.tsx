import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui";
import type { SettingsSectionItem } from "../hooks/useSettingsSections";

interface Props {
  items: SettingsSectionItem[];
}

export default function SettingsOverviewGrid({ items }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <button key={item.key} type="button" onClick={() => navigate(item.path)} className="text-left">
          <Card className="h-full transition hover:shadow-md">
            <CardContent className="space-y-3 p-5">
              <div className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">{item.title}</h3>
              <p className="text-sm text-text-secondary">{item.description}</p>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
