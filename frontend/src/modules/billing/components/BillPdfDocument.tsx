import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { Bill } from "../types/billing";

interface BillPdfDocumentProps {
  bill: Bill;
  gymName: string;
  gymLogoUrl?: string | null;
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
    minWidth: 165,
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
  card: {
    border: "1 solid #e5e7eb",
    borderRadius: 6,
    padding: 10,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cell: { width: "48%" },
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
  statusCard: {
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
    width: "50%",
  },
  footer: {
    marginTop: 12,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerNote: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1 solid #e2e8f0",
    fontSize: 8.5,
    color: "#64748b",
  },
});

const formatAmount = (value: string, currency: string) =>
  `${Number(value).toLocaleString()} ${currency}`;

export default function BillPdfDocument({ bill, gymName, gymLogoUrl }: BillPdfDocumentProps) {
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
                  <Text style={styles.subtitle}>Professional Billing Statement</Text>
                </View>
              </View>
              <View style={styles.invoiceCard}>
                <Text style={styles.invoiceLabel}>Invoice Info</Text>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceRowLabel}>Bill #</Text>
                  <Text style={styles.invoiceRowValue}>{bill.bill_number}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceRowLabel}>Date</Text>
                  <Text style={styles.invoiceRowValue}>{bill.billing_date}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.block, styles.detailRow]}>
              <View style={styles.detailCard}>
                <Text style={styles.cardLabel}>Member Details</Text>
                <Text style={styles.detailText}>Name: {bill.member_name}</Text>
                <Text style={styles.detailText}>Code: {bill.member_code}</Text>
                <Text style={styles.detailText}>Role / Position: {bill.member_role_or_position}</Text>
                <Text style={styles.detailText}>Plan / Class: {bill.membership_plan_or_class}</Text>
              </View>
              <View style={styles.detailCardMuted}>
                <Text style={styles.cardLabel}>Payment Summary</Text>
                <Text style={styles.detailText}>Total Paid (All Months): {formatAmount(bill.total_paid_amount, bill.currency)}</Text>
                <Text style={styles.detailText}>Total Remaining (All Months): {formatAmount(bill.total_outstanding_amount, bill.currency)}</Text>
                <Text style={styles.detailText}>This Bill Paid: {formatAmount(bill.paid_amount, bill.currency)}</Text>
                <Text style={styles.detailText}>This Bill Remaining: {formatAmount(bill.remaining_amount, bill.currency)}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.cardLabel}>Fee Breakdown</Text>
              <View style={styles.table}>
                <View style={[styles.row, styles.head]}>
                  <Text style={styles.colItem}>Item</Text>
                  <Text style={styles.colValue}>Amount</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.colItem}>Original Fee</Text>
                  <Text style={styles.colValue}>{formatAmount(bill.original_fee_amount, bill.currency)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.colItem}>This Bill Discount</Text>
                  <Text style={styles.colValue}>{formatAmount(bill.discount_amount, bill.currency)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.colItem}>Total Discount (All Months)</Text>
                  <Text style={styles.colValue}>{formatAmount(bill.total_discount_amount, bill.currency)}</Text>
                </View>
                <View style={[styles.row, styles.rowFinal]}>
                  <Text style={styles.colItem}>Final Amount</Text>
                  <Text style={styles.colValue}>{formatAmount(bill.final_amount, bill.currency)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.footerNote}>
              <Text>This is a system-generated invoice from {gymName}. Keep this bill for your records.</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
