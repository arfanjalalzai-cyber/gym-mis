import { z } from "zod";

const moneyStringSchema = z.string();
const monthStringSchema = z.string();

export const allowedMonthsSchema = z.union([z.literal(6), z.literal(12), z.literal(24)]);

export const dashboardOverviewResponseSchema = z.object({
  generated_at: z.string(),
  currency: z.string(),
  key_statistics: z.object({
    total_members: z.number(),
    active_members: z.number(),
    inactive_members: z.number(),
    unpaid_members: z.number(),
    expired_members: z.number(),
    total_staff: z.number(),
    monthly_income: moneyStringSchema,
    monthly_expense: moneyStringSchema,
    net_monthly_profit: moneyStringSchema,
    today_attendance: z.number(),
  }),
  financial_overview: z.object({
    today_income: moneyStringSchema,
    monthly_income: moneyStringSchema,
    pending_payments: z.object({
      total_amount: moneyStringSchema,
      member_count: z.number(),
    }),
  }),
  charts: z.object({
    member_growth: z.array(
      z.object({
        month: monthStringSchema,
        new_members: z.number(),
        cumulative_members: z.number(),
      })
    ),
    monthly_income: z.array(
      z.object({
        month: monthStringSchema,
        value: moneyStringSchema,
      })
    ),
    expense_vs_income: z.array(
      z.object({
        month: monthStringSchema,
        income: moneyStringSchema,
        expense: moneyStringSchema,
      })
    ),
  }),
});

export const dashboardActivityResponseSchema = z.object({
  recent_member_registrations: z.array(
    z.object({
      member_id: z.number(),
      member_code: z.string(),
      member_name: z.string(),
      join_date: z.string(),
      created_at: z.string(),
    })
  ),
  recent_payments: z.array(
    z.object({
      payment_id: z.number(),
      member_id: z.number(),
      member_name: z.string(),
      amount: moneyStringSchema,
      payment_method: z.string(),
      is_reversal: z.boolean(),
      paid_at: z.string(),
    })
  ),
  recent_staff_attendance: z.array(
    z.object({
      record_id: z.number(),
      staff_id: z.number(),
      staff_code: z.string(),
      staff_name: z.string(),
      attendance_date: z.string(),
      status: z.string(),
      marked_by_username: z.string().nullable(),
      updated_at: z.string(),
    })
  ),
});

export const dashboardAlertsResponseSchema = z.object({
  expired_membership_alerts: z.array(
    z.object({
      member_id: z.number(),
      member_code: z.string(),
      member_name: z.string(),
      membership_expiry_date: z.string().nullable(),
      days_overdue: z.number().nullable(),
    })
  ),
  payment_due_alerts: z.array(
    z.object({
      member_id: z.number(),
      member_code: z.string(),
      member_name: z.string(),
      remaining_balance: moneyStringSchema,
      oldest_unpaid_cycle_month: z.string().nullable(),
      outstanding_cycles_count: z.number(),
    })
  ),
  totals: z.object({
    expired_memberships: z.number(),
    payment_due_members: z.number(),
  }),
});
