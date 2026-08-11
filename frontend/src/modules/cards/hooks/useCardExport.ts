import { useMemo, useState, type ReactElement, type RefObject } from "react";
import { toPng } from "html-to-image";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

interface UseCardExportOptions {
  printRef: RefObject<HTMLDivElement | null>;
  fileBaseName: string;
  buildPdfDocument: (imageDataUrl: string) => ReactElement<DocumentProps>;
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
};

export const useCardExport = ({
  printRef,
  fileBaseName,
  buildPdfDocument,
}: UseCardExportOptions) => {
  const [isExporting, setIsExporting] = useState(false);

  const normalizedFileName = useMemo(
    () => (fileBaseName || "card").replace(/[^\w\-]+/g, "_"),
    [fileBaseName]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: normalizedFileName,
  });

  const buildImage = async () => {
    if (!printRef.current) {
      throw new Error("Card preview is not ready");
    }
    return toPng(printRef.current, { cacheBust: true, pixelRatio: 2 });
  };

  const handleDownloadPng = async () => {
    try {
      setIsExporting(true);
      const imageDataUrl = await buildImage();
      downloadDataUrl(imageDataUrl, `${normalizedFileName}.png`);
      toast.success("PNG downloaded");
    } catch {
      toast.error("Failed to export PNG");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const imageDataUrl = await buildImage();
      const blob = await pdf(buildPdfDocument(imageDataUrl)).toBlob();
      downloadBlob(blob, `${normalizedFileName}.pdf`);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    handlePrint,
    handleDownloadPng,
    handleDownloadPdf,
  };
};
