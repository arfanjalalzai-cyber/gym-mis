import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, Input, Pagination, PaginationInfo } from "@/components/ui";
import { useStaffList } from "@/modules/staff/queries/useStaff";
import AttendanceMonthlyReportTable from "../components/AttendanceMonthlyReportTable";
import { useAttendanceFilters } from "../hooks/useAttendanceFilters";
import { useAttendanceMonthlyReport } from "../queries/useAttendance";

export default function AttendanceReportPage() {
  const navigate = useNavigate();
  const {
    reportMonth,
    selectedStaffId,
    search,
    page,
    page_size,
    monthlyReportParams,
    updateReportMonth,
    updateSelectedStaffId,
    updateSearch,
    updatePage,
  } = useAttendanceFilters();
  const reportQuery = useAttendanceMonthlyReport(monthlyReportParams, true);
  const { data: staffData } = useStaffList({
    page: 1,
    page_size: 200,
    ordering: "last_name",
  });
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, updateSearch]);

  const totalPages = useMemo(() => {
    if (!reportQuery.data?.count) return 1;
    return Math.max(1, Math.ceil(reportQuery.data.count / page_size));
  }, [reportQuery.data?.count, page_size]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Monthly Report"
        subtitle="Review present, absent, late and leave totals with salary impact."
        actions={[
          {
            label: "Back To Daily",
            icon: <ArrowLeft className="h-4 w-4" />,
            onClick: () => navigate("/attendance"),
          },
        ]}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              type="month"
              label="Report Month"
              value={reportMonth}
              onChange={(event) => updateReportMonth(event.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Staff</label>
              <select
                value={selectedStaffId ?? ""}
                onChange={(event) =>
                  updateSelectedStaffId(event.target.value ? Number(event.target.value) : null)
                }
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All Staff</option>
                {(staffData?.results ?? []).map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.staff_code} - {staff.first_name} {staff.last_name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Search Staff"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by code or name"
            />
          </div>
        </CardContent>
      </Card>

      <AttendanceMonthlyReportTable
        rows={reportQuery.data?.results ?? []}
        loading={reportQuery.isLoading}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
          <PaginationInfo
            currentPage={page}
            pageSize={page_size}
            totalItems={reportQuery.data?.count ?? 0}
          />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={updatePage}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => navigate("/attendance")}>
          Go To Daily Attendance
        </Button>
      </div>
    </div>
  );
}

