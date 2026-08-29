type TimelineInvoice = { id: string; status: string; month: string; dueDate: string };
type TimelineContract = { id: string; status: string; room: string; endDate: string };
type TimelineRepair = { id: string; status: string; type: string; description?: string; appointmentDate?: string };

const dateValue = (value: string) => {
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
};

export function buildTenantTimeline({
  invoices,
  contract,
  repairs,
}: {
  invoices: TimelineInvoice[];
  contract: TimelineContract | null;
  repairs: TimelineRepair[];
}) {
  return {
    invoice: invoices.filter((invoice) => invoice.status === "unpaid").sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate))[0],
    contract: contract && ["pending", "active", "awaiting_approval", "requesting_termination"].includes(contract.status) ? contract : undefined,
    repair: repairs.find((repair) => repair.status !== "done" && repair.appointmentDate),
  };
}

export function daysFromToday(value: string) {
  const timestamp = dateValue(value);
  if (!Number.isFinite(timestamp)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((timestamp - today.getTime()) / 86_400_000);
}
