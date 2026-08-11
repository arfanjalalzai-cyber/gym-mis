import { FileDown, IdCard, ImageDown, Printer, RotateCw } from "lucide-react";

import { Button } from "@/components/ui";

interface CardActionsProps {
  hasCard: boolean;
  generateLoading?: boolean;
  regenerateLoading?: boolean;
  exportLoading?: boolean;
  generationDisabled?: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
}

export default function CardActions({
  hasCard,
  generateLoading = false,
  regenerateLoading = false,
  exportLoading = false,
  generationDisabled = false,
  onGenerate,
  onRegenerate,
  onPrint,
  onDownloadPdf,
  onDownloadPng,
}: CardActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {!hasCard ? (
        <Button
          onClick={onGenerate}
          loading={generateLoading}
          disabled={generationDisabled}
          leftIcon={<IdCard className="h-4 w-4" />}
        >
          Generate Card
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            onClick={onRegenerate}
            loading={regenerateLoading}
            disabled={generationDisabled}
            leftIcon={<RotateCw className="h-4 w-4" />}
          >
            Re-generate
          </Button>
          <Button
            variant="outline"
            onClick={onPrint}
            disabled={exportLoading}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print
          </Button>
          <Button
            variant="outline"
            onClick={onDownloadPdf}
            loading={exportLoading}
            leftIcon={<FileDown className="h-4 w-4" />}
          >
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={onDownloadPng}
            loading={exportLoading}
            leftIcon={<ImageDown className="h-4 w-4" />}
          >
            Export PNG
          </Button>
        </>
      )}
    </div>
  );
}
