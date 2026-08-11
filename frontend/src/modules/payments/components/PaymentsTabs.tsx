import type { ReactNode } from "react";
import { CreditCard, WalletCards } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import type { PaymentsTab } from "../types/payments";

interface PaymentsTabsProps {
  activeTab: PaymentsTab;
  onChange: (tab: PaymentsTab) => void;
  memberContent: ReactNode;
  staffContent: ReactNode;
}

export default function PaymentsTabs({
  activeTab,
  onChange,
  memberContent,
  staffContent,
}: PaymentsTabsProps) {
  return (
    <Tabs
      key={activeTab}
      defaultValue={activeTab}
      onChange={(value) => onChange(value as PaymentsTab)}
    >
      <TabsList>
        <TabsTrigger value="member_fees" icon={<CreditCard className="h-4 w-4" />}>
          Member Fees
        </TabsTrigger>
        <TabsTrigger value="staff_salaries" icon={<WalletCards className="h-4 w-4" />}>
          Staff Salaries
        </TabsTrigger>
      </TabsList>

      <TabsContent value="member_fees">{memberContent}</TabsContent>
      <TabsContent value="staff_salaries">{staffContent}</TabsContent>
    </Tabs>
  );
}
