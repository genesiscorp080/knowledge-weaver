import { Progress } from "@/components/ui/progress";

export interface PdfExportStatus {
  percent: number;
  stage: string;
}

export function PdfExportProgress({ percent, stage }: PdfExportStatus) {
  return (
    <div className="w-full min-w-0 space-y-2 pt-1 text-foreground" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span>{stage}</span>
        <span className="shrink-0 tabular-nums">{percent} %</span>
      </div>
      <Progress value={percent} aria-label="Préparation du PDF" aria-valuenow={percent} className="h-2" />
    </div>
  );
}