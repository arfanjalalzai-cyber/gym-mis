import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Pagination, PaginationInfo } from "@/components/ui";
import StaffSearchFilters from "../components/StaffSearchFilters";
import StaffTable from "../components/StaffTable";
import { useStaffFilters } from "../hooks/useStaffFilters";
import { useStaffList } from "../queries/useStaff";

export default function StaffListPage() {
  const navigate = useNavigate();
  const {
    search,
    position,
    employment_status,
    salary_status,
    page,
    page_size,
    listParams,
    updateSearch,
    updatePosition,
    updateEmploymentStatus,
    updateSalaryStatus,
    updatePage,
  } = useStaffFilters();
  const { data, isLoading } = useStaffList(listParams);
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
    if (!data?.count) return 1;
    return Math.max(1, Math.ceil(data.count / page_size));
  }, [data?.count, page_size]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle="Manage trainers, managers and other staff"
        actions={[
          {
            label: "Add Staff",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => navigate("/staff/new"),
          },
        ]}
      />

      <StaffSearchFilters
        search={searchInput}
        position={position}
        employmentStatus={employment_status}
        salaryStatus={salary_status}
        onSearchChange={setSearchInput}
        onPositionChange={updatePosition}
        onEmploymentStatusChange={updateEmploymentStatus}
        onSalaryStatusChange={updateSalaryStatus}
      />

      <Card>
        <CardContent className="space-y-4">
          <StaffTable
            staff={data?.results ?? []}
            loading={isLoading}
            onRowClick={(staff) => navigate(`/staff/${staff.id}`)}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <PaginationInfo
              currentPage={page}
              pageSize={page_size}
              totalItems={data?.count ?? 0}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => updatePage(nextPage)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
