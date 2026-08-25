import assert from "node:assert/strict";
import test from "node:test";
import { buildTenantTimeline } from "../utils/tenantTimeline.ts";

test("keeps the closest unpaid invoice and active contract for the signed-in tenant timeline", () => {
  const timeline = buildTenantTimeline({
    invoices: [
      { id: "later", status: "unpaid", month: "09/2026", dueDate: "20/09/2026" },
      { id: "soon", status: "unpaid", month: "08/2026", dueDate: "26/08/2026" },
      { id: "paid", status: "paid", month: "08/2026", dueDate: "20/08/2026" },
    ],
    contract: { id: "contract-1", status: "active", room: "P.102", endDate: "09/10/2026" },
    repairs: [{ id: "repair-1", status: "processing", type: "Điều hòa", appointmentDate: "28/08/2026" }],
  });

  assert.equal(timeline.invoice?.id, "soon");
  assert.equal(timeline.contract?.id, "contract-1");
  assert.equal(timeline.repair?.id, "repair-1");
});

test("does not surface a repair without an explicit appointment date", () => {
  const timeline = buildTenantTimeline({
    invoices: [],
    contract: null,
    repairs: [{ id: "repair-1", status: "processing", type: "Điều hòa" }],
  });

  assert.equal(timeline.repair, undefined);
});
