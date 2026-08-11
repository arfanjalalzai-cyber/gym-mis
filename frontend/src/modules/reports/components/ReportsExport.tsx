import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { Download, Printer } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportSection {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, ReactNode>[];
}

interface ReportActionsProps {
  onPrint: () => void;
  onPdf: () => void;
  disabled?: boolean;
}

export function ReportActions({ onPrint, onPdf, disabled = false }: ReportActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPrint}
        disabled={disabled}
        leftIcon={<Printer className="h-4 w-4" />}
      >
        Print
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPdf}
        disabled={disabled}
        leftIcon={<Download className="h-4 w-4" />}
      >
        PDF
      </Button>
    </div>
  );
}

interface ReportsPrintLayoutProps {
  title: string;
  sections: ReportSection[];
}

const stringifyCell = (value: ReactNode) => {
  if (value === null || value === undefined || value === false) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
};

export const ReportsPrintLayout = forwardRef<HTMLDivElement, ReportsPrintLayoutProps>(
  ({ title, sections }, ref) => (
    <div ref={ref} className="bg-white p-8 text-slate-900">
      <div className="mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Generated {new Date().toLocaleString()}</p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="break-inside-avoid">
            <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {section.columns.map((column) => (
                    <th
                      key={column.key}
                      className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.length > 0 ? (
                  section.rows.map((row, rowIndex) => (
                    <tr key={`${section.title}-${rowIndex}`}>
                      {section.columns.map((column) => (
                        <td key={column.key} className="border border-slate-300 px-2 py-1.5">
                          {row[column.key] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="border border-slate-300 px-2 py-3 text-center text-slate-500"
                      colSpan={section.columns.length}
                    >
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  )
);

ReportsPrintLayout.displayName = "ReportsPrintLayout";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
  },
  generated: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  row: {
    flexDirection: "row",
  },
  headerCell: {
    flex: 1,
    padding: 4,
    backgroundColor: "#e2e8f0",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    fontWeight: 700,
  },
  cell: {
    flex: 1,
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  empty: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    textAlign: "center",
    color: "#64748b",
  },
});

function ReportsPdfDocument({ title, sections }: ReportsPrintLayoutProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.generated}>Generated {new Date().toLocaleString()}</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.table}>
              <View style={styles.row}>
                {section.columns.map((column) => (
                  <Text key={column.key} style={styles.headerCell}>
                    {column.label}
                  </Text>
                ))}
              </View>
              {section.rows.length > 0 ? (
                section.rows.map((row, rowIndex) => (
                  <View key={`${section.title}-${rowIndex}`} style={styles.row}>
                    {section.columns.map((column) => (
                      <Text key={column.key} style={styles.cell}>
                        {stringifyCell(row[column.key])}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No data available.</Text>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadReportsPdf = async (
  title: string,
  sections: ReportSection[],
  fileName: string
) => {
  try {
    const blob = await pdf(<ReportsPdfDocument title={title} sections={sections} />).toBlob();
    downloadBlob(blob, fileName);
    toast.success("PDF downloaded");
  } catch {
    toast.error("Failed to export PDF");
  }
};
