import { DataTable as PrimeDataTable } from "primereact/datatable";
import { Column } from "primereact/column";

interface ColumnDef {
  field: string;
  header: string;
  sortable?: boolean;
  body?: (rowData: unknown) => React.ReactNode;
}

interface MISDataTableProps<T> {
  data: T[];
  columns: ColumnDef[];
  loading?: boolean;
  [key: string]: unknown;
}

export default function DataTable<T>({
  data,
  columns,
  loading = false,
  ...props
}: MISDataTableProps<T>) {
  return (
    <PrimeDataTable
      value={data as any[]}
      loading={loading}
      paginator
      rows={10}
      rowsPerPageOptions={[5, 10, 25, 50]}
      className="rounded-xl bg-card shadow-sm"
      {...(props as Record<string, unknown>)}
    >
      {columns.map((col) => (
        <Column
          key={col.field}
          field={col.field}
          header={col.header}
          sortable={col.sortable}
          body={col.body}
        />
      ))}
    </PrimeDataTable>
  );
}
