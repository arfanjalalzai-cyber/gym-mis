import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

interface CardPdfDocumentProps {
  title: string;
  imageDataUrl: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
  },
  shell: {
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 12,
  },
  image: {
    width: "100%",
    objectFit: "contain",
  },
});

export default function CardPdfDocument({ title, imageDataUrl }: CardPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.shell}>
          <Image src={imageDataUrl} style={styles.image} />
        </View>
      </Page>
    </Document>
  );
}

