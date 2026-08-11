import { CalendarDays, FileBarChart2 } from "lucide-react";

import { Button, Card, CardContent, Input } from "@/components/ui";

interface AttendanceDateToolbarProps {
  selectedDate: string;
  onDateChange: (value: string) => void;
  onOpenReport: () => void;
}

export default function AttendanceDateToolbar({
  selectedDate,
  onDateChange,
  onOpenReport,
}: AttendanceDateToolbarProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-xs">
          <Input
            type="date"
            label="Attendance Date"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            leftIcon={<CalendarDays className="h-4 w-4" />}
            max={new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kabul",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date())}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          leftIcon={<FileBarChart2 className="h-4 w-4" />}
          onClick={onOpenReport}
        >
          Open Monthly Report
        </Button>
      </CardContent>
    </Card>
  );
}

