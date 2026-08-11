import {
  Briefcase,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import { DashboardCard } from "@/components";
import { SkeletonCard } from "@/components/ui";
import type { DashboardKeyStatistics } from "../types/dashboard";

interface DashboardStatsGridProps {
  data?: DashboardKeyStatistics;
  loading?: boolean;
  currency?: string;
}

const formatMoney = (value?: string, currency = "AFN") =>
  `${currency} ${Number(value ?? "0").toLocaleString()}`;

export default function DashboardStatsGrid({
  data,
  loading = false,
  currency = "AFN",
}: DashboardStatsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        title="Total Members"
        value={data?.total_members ?? 0}
        icon={Users}
        color="primary"
      />
      <DashboardCard
        title="Active Members"
        value={data?.active_members ?? 0}
        icon={UserCheck}
        color="success"
      />
      <DashboardCard
        title="Inactive Members"
        value={data?.inactive_members ?? 0}
        icon={UserX}
        color="warning"
      />
      <DashboardCard
        title="Unpaid Members"
        value={data?.unpaid_members ?? 0}
        icon={CreditCard}
        color="error"
      />
      <DashboardCard
        title="Total Staff"
        value={data?.total_staff ?? 0}
        icon={Briefcase}
        color="info"
      />
      <DashboardCard
        title="Monthly Expense"
        value={formatMoney(data?.monthly_expense, currency)}
        icon={HandCoins}
        color="warning"
      />
      <DashboardCard
        title="Net Monthly Profit"
        value={formatMoney(data?.net_monthly_profit, currency)}
        icon={CircleDollarSign}
        color="success"
      />
      <DashboardCard
        title="Today Present Staff"
        value={data?.today_attendance ?? 0}
        icon={CalendarClock}
        color="info"
      />
    </div>
  );
}
