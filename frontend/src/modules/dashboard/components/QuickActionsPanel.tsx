import { Plus, Receipt, UserPlus, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, Button } from "@/components/ui";

export default function QuickActionsPanel() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => navigate("/members/new")}
            fullWidth
          >
            Add Member
          </Button>
          <Button
            variant="outline"
            leftIcon={<Wallet className="h-4 w-4" />}
            onClick={() => navigate("/payments")}
            fullWidth
          >
            Add Payment
          </Button>
          <Button
            variant="outline"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate("/staff/new")}
            fullWidth
          >
            Add Staff
          </Button>
          <Button
            variant="outline"
            leftIcon={<Receipt className="h-4 w-4" />}
            onClick={() => navigate("/members")}
            fullWidth
          >
            Member Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
