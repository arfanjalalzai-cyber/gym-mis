import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthGuard } from "@/providers";
import {
  LoginPage,
  SignUpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "@/modules/auth/index";
import NotFoundPage from "@/pages/PageNotFounded";
import { MISLayout } from "@/components";
import { DashboardPage } from "@/modules/dashboard";
import {
  BackupMaintenanceSettingsPage,
  GymInformationSettingsPage,
  MembershipPlanSettingsPage,
  PaymentBillingSettingsPage,
  SecuritySettingsPage,
  SettingsOverviewPage,
  SystemPreferencesSettingsPage,
  UserRoleManagementSettingsPage,
} from "@/modules/settings";
import { UserProfile } from "@/modules/profile";
import {
  AddMemberPage,
  EditMemberPage,
  MemberProfilePage,
  MembersListPage,
} from "@/modules/members";
import {
  AddStaffPage,
  EditStaffPage,
  StaffListPage,
  StaffSalaryBillDetailsPage,
  StaffProfilePage,
} from "@/modules/staff";
import {
  AddEquipmentPage,
  EditEquipmentPage,
  EquipmentHistoryPage,
  EquipmentProfilePage,
  InventoryListPage,
} from "@/modules/inventory";
import {
  AddScheduleSlotPage,
  EditScheduleSlotPage,
  ScheduleClassesPage,
  ScheduleWeeklyPage,
} from "@/modules/schedule";
import { AttendanceDailyPage, AttendanceReportPage } from "@/modules/attendance";
import { PaymentsPage } from "@/modules/payments";
import { BillDetailsPage, BillingPage } from "@/modules/billing";
import { ExpensesPage, ReportsDashboardPage } from "@/modules/reports";
import { MemberCardPage, StaffCardPage } from "@/modules/cards";

function AppRouterProvider() {
  const router = createBrowserRouter([
    // Public Website Routes (CMS)
    {
      path: "/",
      element: (
        <AuthGuard>
          <MISLayout />
        </AuthGuard>
      ),
      errorElement: <NotFoundPage />,
      children: [
        // Dashboard
        { index: true, element: <DashboardPage /> },
        // Settings
        { path: "settings", element: <SettingsOverviewPage /> },
        { path: "settings/gym-information", element: <GymInformationSettingsPage /> },
        { path: "settings/user-role-management", element: <UserRoleManagementSettingsPage /> },
        { path: "settings/membership-plans", element: <MembershipPlanSettingsPage /> },
        { path: "settings/payment-billing", element: <PaymentBillingSettingsPage /> },
        { path: "settings/security", element: <SecuritySettingsPage /> },
        { path: "settings/system-preferences", element: <SystemPreferencesSettingsPage /> },
        { path: "settings/backup-maintenance", element: <BackupMaintenanceSettingsPage /> },

        // Legacy compatibility aliases for one release window.
        { path: "settings/general", element: <GymInformationSettingsPage /> },
        { path: "settings/users", element: <UserRoleManagementSettingsPage /> },

        // Profile
        { path: "profile", element: <UserProfile /> },

        // Members
        { path: "members", element: <MembersListPage /> },
        { path: "members/new", element: <AddMemberPage /> },
        { path: "members/:id", element: <MemberProfilePage /> },
        { path: "members/:id/edit", element: <EditMemberPage /> },
        { path: "members/:id/card", element: <MemberCardPage /> },

        // Staff
        { path: "staff", element: <StaffListPage /> },
        { path: "staff/new", element: <AddStaffPage /> },
        { path: "staff/:id", element: <StaffProfilePage /> },
        { path: "staff/:id/edit", element: <EditStaffPage /> },
        { path: "staff/:id/card", element: <StaffCardPage /> },
        { path: "staff-salary-bills/:id", element: <StaffSalaryBillDetailsPage /> },

        // Inventory
        { path: "inventory", element: <InventoryListPage /> },
        { path: "inventory/new", element: <AddEquipmentPage /> },
        { path: "inventory/:id", element: <EquipmentProfilePage /> },
        { path: "inventory/:id/edit", element: <EditEquipmentPage /> },
        { path: "inventory/:id/history", element: <EquipmentHistoryPage /> },

        // Schedule
        { path: "schedule", element: <ScheduleWeeklyPage /> },
        { path: "schedule/classes", element: <ScheduleClassesPage /> },
        { path: "schedule/new", element: <AddScheduleSlotPage /> },
        { path: "schedule/:id/edit", element: <EditScheduleSlotPage /> },

        // Attendance
        { path: "attendance", element: <AttendanceDailyPage /> },
        { path: "attendance/report", element: <AttendanceReportPage /> },

        // Payments
        { path: "payments", element: <PaymentsPage /> },

        // Billing
        { path: "billing", element: <BillingPage /> },
        { path: "billing/:id", element: <BillDetailsPage /> },

        // Reports
        { path: "reports", element: <ReportsDashboardPage /> },
        { path: "expenses", element: <ExpensesPage /> },
      ],
    },

    // MIS Auth Routes (Public)
    {
      path: "/auth/login",
      element: <LoginPage />,
    },
    {
      path: "/auth/signup",
      element: <SignUpPage />,
    },
    {
      path: "/auth/forgot-password",
      element: <ForgotPasswordPage />,
    },
    {
      path: "/auth/reset-password",
      element: <ResetPasswordPage />,
    },
    {
      path: "/auth/verify-email/:token",
      element: <VerifyEmailPage />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default AppRouterProvider;
