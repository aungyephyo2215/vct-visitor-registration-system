import { Badge } from "@/components/ui/badge";

const visitStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  EXPECTED: { label: "Expected", variant: "outline" },
  CHECKED_IN: { label: "Checked In", variant: "default" },
  CHECKED_OUT: { label: "Checked Out", variant: "secondary" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

interface StatusBadgeProps {
  status: string;
  type?: "visit" | "user" | "qr";
}

export function StatusBadge({ status, type = "visit" }: StatusBadgeProps) {
  if (type === "visit") {
    const config = visitStatusMap[status] || {
      label: status,
      variant: "outline" as const,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>;
}
