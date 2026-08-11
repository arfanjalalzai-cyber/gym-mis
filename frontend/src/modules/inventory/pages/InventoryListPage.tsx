import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Pagination, PaginationInfo } from "@/components/ui";
import EquipmentSearchFilters from "../components/EquipmentSearchFilters";
import EquipmentTable from "../components/EquipmentTable";
import { useEquipmentFilters } from "../hooks/useEquipmentFilters";
import { useEquipmentList } from "../queries/useInventory";

export default function InventoryListPage() {
  const navigate = useNavigate();
  const {
    search,
    itemType,
    category,
    machineStatus,
    lowStockOnly,
    page,
    page_size,
    listParams,
    updateSearch,
    updateItemType,
    updateCategory,
    updateMachineStatus,
    updateLowStockOnly,
    updatePage,
  } = useEquipmentFilters();
  const { data, isLoading } = useEquipmentList(listParams);
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
        title="Inventory"
        subtitle="Manage machines, accessories, consumables, and stock alerts"
        actions={[
          {
            label: "Add Equipment",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => navigate("/inventory/new"),
          },
        ]}
      />

      <EquipmentSearchFilters
        search={searchInput}
        itemType={itemType}
        category={category}
        machineStatus={machineStatus}
        lowStockOnly={lowStockOnly}
        onSearchChange={setSearchInput}
        onItemTypeChange={updateItemType}
        onCategoryChange={updateCategory}
        onMachineStatusChange={updateMachineStatus}
        onLowStockToggle={updateLowStockOnly}
      />

      <Card>
        <CardContent className="space-y-4">
          <EquipmentTable
            equipments={data?.results ?? []}
            loading={isLoading}
            onRowClick={(equipment) => navigate(`/inventory/${equipment.id}`)}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <PaginationInfo
              currentPage={page}
              pageSize={page_size}
              totalItems={data?.count ?? 0}
            />
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={updatePage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
