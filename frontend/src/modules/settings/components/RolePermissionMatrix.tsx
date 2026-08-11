import { useMemo } from "react";

import { Button, Card, CardContent, Checkbox } from "@/components/ui";
import type { ModuleActions, RolePermissionAssignment, SettingsRoleName } from "../types";

interface Props {
  roleName: SettingsRoleName;
  modules: ModuleActions[];
  value: RolePermissionAssignment[];
  onChange: (next: RolePermissionAssignment[]) => void;
  onSave: () => void;
  saving: boolean;
  loading?: boolean;
}

const allActions = ["view", "add", "change", "delete"] as const;

export default function RolePermissionMatrix({ roleName, modules, value, onChange, onSave, saving, loading = false }: Props) {
  const index = useMemo(() => {
    const map = new Map<string, Set<string>>();
    value.forEach((item) => map.set(item.module, new Set(item.actions)));
    return map;
  }, [value]);

  const toggleAction = (moduleName: string, actionName: string) => {
    const map = new Map<string, Set<string>>();
    value.forEach((item) => map.set(item.module, new Set(item.actions)));

    const existing = map.get(moduleName) ?? new Set<string>();
    if (existing.has(actionName)) {
      existing.delete(actionName);
    } else {
      existing.add(actionName);
    }
    map.set(moduleName, existing);

    const next = Array.from(map.entries()).map(([module, actions]) => ({
      module,
      actions: Array.from(actions) as Array<"view" | "add" | "change" | "delete">,
    }));
    onChange(next);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Role Permissions: {roleName}</h3>
          <Button type="button" size="sm" onClick={onSave} loading={saving} disabled={loading}>
            Save Permissions
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading permissions...</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-2 pr-4">Module</th>
                {allActions.map((action) => (
                  <th key={action} className="py-2 pr-4 capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.module} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium text-text-primary">{module.label}</td>
                  {allActions.map((action) => (
                    <td key={`${module.module}-${action}`} className="py-2 pr-4">
                      <Checkbox
                        checked={index.get(module.module)?.has(action) ?? false}
                        onChange={() => toggleAction(module.module, action)}
                        disabled={!module.actions.includes(action)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
