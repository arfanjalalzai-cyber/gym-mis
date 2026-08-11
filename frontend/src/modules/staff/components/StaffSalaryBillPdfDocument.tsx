import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { StaffSalaryPeriod } from "@/modules/payments/types/payments";
import type { Staff } from "../types/staff";

interface StaffSalaryBillPdfDocumentProps {
  staff: Staff;
  period: StaffSalaryPeriod;
  gymName: string;
  gymLogoUrl?: string | null;
  formatDate: (value: string) => string;
}

const styles = StyleSheet.create({
  page: { padding: 22, fontSize: 10.5, color: "#0f172a", backgroundColor: "#f8fafc" },
  shell: {
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  topBand: { height: 8, backgroundColor: "#0D9488" },
  body: { padding: 16 },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  headerLeft: { display: "flex", flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 44, height: 44, borderRadius: 8, objectFit: "cover" },
  title: { fontSize: 19, fontWeight: 800 },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 2 },
  invoiceCard: {
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    padding: 8,
    minWidth: 170,
  },
  invoiceLabel: { fontSize: 8, textTransform: "uppercase", color: "#64748b", marginBottom: 4 },
  invoiceRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  invoiceRowLabel: { color: "#64748b", fontWeight: 700 },
  invoiceRowValue: { color: "#0f172a", fontWeight: 800 },
  block: { marginTop: 12 },
  detailRow: { display: "flex", flexDirection: "row", gap: 8 },
  detailCard: {
    width: "50%",
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    padding: 8,
  },
  detailCardMuted: {
    width: "50%",
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
  },
  cardLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 5 },
  detailText: { marginBottom: 3, lineHeight: 1.4 },
  table: { border: "1 solid #e2e8f0", borderRadius: 8, marginTop: 6, overflow: "hidden" },
  row: {
    display: "flex",
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
  },
  head: { backgroundColor: "#ffffff", fontWeight: 700 },
  rowFinal: { backgroundColor: "#CCFBF1", fontWeight: 800 },
  colItem: { width: "60%", padding: 8, fontWeight: 600 },
  colValue: { width: "40%", padding: 8, textAlign: "right" },
  footerNote: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1 solid #e2e8f0",
    fontSize: 8.5,
    color: "#64748b",
  },
});

const formatAmount = (value: string | number, currency: string) =>
  `${Number(value).toLocaleString()} ${currency}`;

const getPositionLabel = (position: string, positionOther?: string | null) => {
  if (position === "other" && positionOther) return positionOther;
  return position.charAt(0).toUpperCase() + position.slice(1);
};

const getBillNumber = (period: StaffSalaryPeriod) =>
  `SAL-${String(period.id).padStart(6, "0")}`;

export default function StaffSalaryBillPdfDocument({
  staff,
  period,
  gymName,
  gymLogoUrl,
  formatDate,
}: StaffSalaryBillPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.topBand} />
          <View style={styles.body}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {gymLogoUrl ? <Image style={styles.logo} src={gymLogoUrl} /> : null}
                <View>
                  <Text style={styles.title}>{gymName}</Text>
                  <Text style={styles.subtitle}>Professional Salary Statement</Text>
                </View>
              </View>
              <View style={styles.invoiceCard}>
                <Text style={styles.invoiceLabel}>Salary Bill Info</Text>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceRowLabel}>Bill #</Text>
                  <Text style={styles.invoiceRowValue}>{getBillNumber(period)}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceRowLabel}>Month</Text>
                  <Text style={styles.invoiceRowValue}>{formatDate(period.period_month)}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.block, styles.detailRow]}>
              <View style={styles.detailCard}>
                <Text style={styles.cardLabel}>Staff Details</Text>
                <Text style={styles.detailText}>Name: {period.staff_name}</Text>
                <Text style={styles.detailText}>Code: {period.staff_code}</Text>
                <Text style={styles.detailText}>Position: {getPositionLabel(staff.position, staff.position_other)}</Text>
                <Text style={styles.detailText}>Mobile: {staff.mobile_number || "-"}</Text>
              </View>
              <View style={styles.detailCardMuted}>
                <Text style={styles.cardLabel}>Salary Summary</Text>
                <Text style={styles.detailText}>Paid: {formatAmount(period.paid_amount, period.currency)}</Text>
                <Text style={styles.detailText}>Remaining: {formatAmount(period.remaining_amount, period.currency)}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.cardLabel}>Salary Breakdown</Text>
              <View style={styles.table}>
                <View style={[styles.row, styles.head]}>
                  <Text style={styles.colItem}>Item</Text>
                  <Text style={styles.colValue}>Amount</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.colItem}>Gross Salary</Text>
                  <Text style={styles.colValue}>{formatAmount(period.gross_salary_amount, period.currency)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.colItem}>Paid Amount</Text>
                  <Text style={styles.colValue}>{formatAmount(period.paid_amount, period.currency)}</Text>
                </View>
                <View style={[styles.row, styles.rowFinal]}>
                  <Text style={styles.colItem}>Remaining Amount</Text>
                  <Text style={styles.colValue}>{formatAmount(period.remaining_amount, period.currency)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.footerNote}>
              <Text>This is a system-generated salary statement from {gymName}. Keep this bill for payroll records.</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
