// ============================================================================
// Report Controller
// ADMIN-only. Three views onto the same underlying data, all sharing the
// same date-range filter (a specific day, or "all time since launch" when
// no range is given):
//   - GET /api/reports/summary   quick counters + financial totals
//   - GET /api/reports/detailed  a flat table of every service scenario —
//     completed, cancelled, delayed, ended early, and expired — powering
//     the interactive on-screen preview before a PDF is generated
//   - GET /api/reports/pdf       the same data as a downloadable PDF
//
// Financial categories, defined precisely so "zero monetary loss" is an
// auditable claim rather than a slogan:
//   - received   = sum of transaction.amount where status = PAID
//   - uncollected = sum of transaction.amount where status IN (UNPAID, PARTIAL)
//                   — a service was delivered (or cut short) but the money
//                   for it hasn't been (fully) collected yet
//   - refunded   = sum of transaction.refundAmount where status = REFUNDED
//   - net        = received - refunded
// Every dollar is tied to the staff member who delivered the service
// (session.staff), the person who started the booking (session.startedBy),
// whoever ended/cancelled it (session.endedBy), the cashier who took the
// payment (transaction.cashier), and — if applicable — whoever issued a
// refund (transaction.refundedBy).
// ============================================================================

const PDFDocument = require("pdfkit");
const prisma = require("../config/prismaClient");

const PERSON_SELECT = { select: { firstName: true, lastName: true, role: true } };

/** Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD into UTC day-boundary Dates, or null/null for "all time". */
function parseDateRange(from, to) {
  if (!from && !to) return { start: null, end: null };
  const start = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const end = to ? new Date(`${to}T23:59:59.999Z`) : from ? new Date(`${from}T23:59:59.999Z`) : null;
  return { start, end };
}

function actorLabel(person) {
  if (!person) return "—";
  return `${person.firstName} ${person.lastName} (${person.role.toLowerCase()})`;
}

const SESSION_INCLUDE = {
  room: true,
  service: true,
  staff: PERSON_SELECT,
  startedBy: PERSON_SELECT,
  endedBy: PERSON_SELECT,
  transaction: { include: { cashier: PERSON_SELECT, refundedBy: PERSON_SELECT } },
};

/**
 * Named "scenario" filters an admin/cashier can slice the report by — each
 * one a predicate over a row, so the same definition drives the on-screen
 * table, the PDF, the CSV and the Excel export identically. "all" (the
 * default) applies no filter.
 */
const SCENARIOS = {
  all: { label: "All", test: () => true },
  completed: { label: "Completed", test: (r) => r.status === "COMPLETED" },
  cancelled: { label: "Cancelled", test: (r) => r.status === "CANCELLED" },
  expired: { label: "Expired (no-show)", test: (r) => r.status === "EXPIRED" },
  onHold: { label: "On hold", test: (r) => r.status === "ON_HOLD" },
  bookedRemotely: { label: "Booked ahead", test: (r) => r.bookedRemotely === true },
  delayed: { label: "Delayed arrival", test: (r) => r.delayed === true },
  endedEarly: { label: "Ended early", test: (r) => r.endedEarly === true },
  paid: { label: "Paid", test: (r) => r.financialOutcome === "paid" },
  unpaid: { label: "Unpaid", test: (r) => r.financialOutcome === "unpaid" },
  partial: { label: "Partial payment", test: (r) => r.financialOutcome === "partial" },
  refunded: { label: "Refunded", test: (r) => r.financialOutcome === "refunded" },
};

/**
 * Builds one complete, self-contained sentence per row — everything
 * needed to understand that scenario without cross-referencing another
 * column, no matter which SCENARIOS filter it's viewed under. Used as the
 * "Details" column on screen and in every export.
 */
function detailsText(r) {
  const parts = [];
  if (r.status === "CANCELLED") {
    parts.push(`Cancelled by ${r.endedBy}${r.cancelReason ? ` — reason: ${r.cancelReason}` : " (no reason given)"}`);
  } else if (r.status === "EXPIRED") {
    parts.push("No-show — customer never arrived, auto-expired after the hold window");
  } else if (r.status === "ON_HOLD") {
    parts.push(r.bookedRemotely ? "Booked ahead — awaiting the customer's check-in" : "Awaiting check-in after going on hold");
  } else if (r.status === "COMPLETED") {
    parts.push(`${r.endedEarly ? "Ended early" : "Completed in full"} by ${r.endedBy}`);
  } else {
    parts.push(r.status);
  }
  if (r.delayed && r.status !== "ON_HOLD") parts.push("arrival was delayed past the 10-minute window");
  if (r.financialOutcome === "refunded") {
    parts.push(
      `Refunded ${r.refundAmount != null ? r.refundAmount.toLocaleString() : r.amount.toLocaleString()} by ${r.refundedBy || "—"}${r.refundReason ? ` — reason: ${r.refundReason}` : ""}`
    );
  } else if (r.financialOutcome === "partial") {
    parts.push(`Only part of ${r.amount.toLocaleString()} collected so far`);
  } else if (r.financialOutcome === "unpaid") {
    parts.push(`${r.amount.toLocaleString()} still uncollected`);
  }
  return parts.join(". ");
}

function computeTotals(rows) {
  const totals = {
    completedCount: 0,
    cancelledCount: 0,
    expiredCount: 0,
    onHoldCount: 0,
    delayedCount: 0,
    earlyEndedCount: 0,
  };
  let received = 0;
  let uncollected = 0;
  let refunded = 0;

  rows.forEach((r) => {
    if (r.status === "COMPLETED") totals.completedCount += 1;
    if (r.status === "CANCELLED") totals.cancelledCount += 1;
    if (r.status === "EXPIRED") totals.expiredCount += 1;
    if (r.status === "ON_HOLD") totals.onHoldCount += 1;
    if (r.delayed) totals.delayedCount += 1;
    if (r.endedEarly) totals.earlyEndedCount += 1;
    if (r.financialOutcome === "paid") received += r.amount;
    else if (r.financialOutcome === "unpaid" || r.financialOutcome === "partial") uncollected += r.amount;
    else if (r.financialOutcome === "refunded") refunded += r.refundAmount ?? r.amount;
  });

  return { ...totals, totalSessions: rows.length, received, uncollected, refunded, net: received - refunded };
}

/**
 * scenario: one of the SCENARIOS keys above (defaults to "all"). Totals
 * are always recomputed from whichever rows survive the filter, so a
 * filtered slice's summary strip/cards genuinely describe just that
 * slice — never the unfiltered branch-wide numbers under a misleading
 * "Ended early" heading.
 */
async function gatherReportData(companyId, branchId, from, to, scenario = "all") {
  // A specific branch is scoped by its own id (already verified to belong
  // to this company by restrictToOwnBranch before we get here). With NO
  // branchId ("all my branches"), we must still never aggregate beyond
  // this ONE company's branches — that's the fix: filter by companyId via
  // the branch relation instead of leaving this unrestricted.
  const branchFilter = branchId ? { branchId } : { branch: { companyId } };
  const { start, end } = parseDateRange(from, to);
  const dateFilter = start && end ? { registeredAt: { gte: start, lte: end } } : {};
  const where = { ...branchFilter, ...dateFilter };

  const [sessions, branch] = await Promise.all([
    prisma.session.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: { registeredAt: "desc" },
    }),
    branchId ? prisma.branch.findFirst({ where: { id: branchId, companyId } }) : Promise.resolve(null),
  ]);

  const allRows = sessions.map((s) => {
    let financialOutcome = "n/a";
    const t = s.transaction;
    if (t) {
      if (t.status === "PAID") financialOutcome = "paid";
      else if (t.status === "UNPAID" || t.status === "PARTIAL") financialOutcome = t.status.toLowerCase();
      else if (t.status === "REFUNDED") financialOutcome = "refunded";
    }

    const row = {
      id: s.id,
      customerName: s.customerName || "—",
      room: s.room ? `${s.room.name} (#${s.room.roomNumber})` : "—",
      service: s.service?.name || "—",
      staff: s.staff ? `${s.staff.firstName} ${s.staff.lastName}` : "—",
      status: s.status,
      delayed: s.delayed,
      endedEarly: s.endedEarly,
      bookedRemotely: s.bookedRemotely,
      registeredAt: s.registeredAt,
      endedAt: s.endedAt,
      amount: t ? Number(t.amount) : Number(s.service?.price || 0),
      paymentStatus: t?.status || null,
      transactionId: t?.id || null,
      financialOutcome,
      startedBy: actorLabel(s.startedBy),
      endedBy: actorLabel(s.endedBy),
      cashier: t ? actorLabel(t.cashier) : "—",
      cancelReason: s.cancelReason || null,
      refundAmount: t?.refundAmount != null ? Number(t.refundAmount) : null,
      refundedBy: t?.refundedBy ? actorLabel(t.refundedBy) : null,
      refundReason: t?.refundReason || null,
    };
    row.details = detailsText(row);
    return row;
  });

  const activeScenario = SCENARIOS[scenario] ? scenario : "all";
  const rows = SCENARIOS[activeScenario].test ? allRows.filter(SCENARIOS[activeScenario].test) : allRows;

  return {
    branchName: branch?.name || "All branches",
    range: from || to ? { from: from || to, to: to || from } : { from: null, to: null },
    scenario: activeScenario,
    scenarioLabel: SCENARIOS[activeScenario].label,
    generatedAt: new Date(),
    rows,
    totals: computeTotals(rows),
  };
}

/**
 * GET /api/reports/summary?branchId=&from=&to=&scenario=
 */
async function getSummary(req, res) {
  try {
    const { branchId, from, to, scenario } = req.query;
    const data = await gatherReportData(req.user.companyId, branchId || null, from || null, to || null, scenario);
    // The summary endpoint doesn't need the full row list — keep it light.
    const { rows, ...summary } = data;
    return res.status(200).json(summary);
  } catch (error) {
    console.error("getSummary error:", error);
    return res.status(500).json({ message: "Server error building the report summary." });
  }
}

/**
 * GET /api/reports/scenarios
 * The fixed list of scenario filters (key + label) every report view can
 * be sliced by — lets the frontend build its filter dropdown/pills from
 * the same single source of truth the backend filters with, instead of
 * a hardcoded copy that could drift out of sync.
 */
async function listScenarios(req, res) {
  const scenarios = Object.entries(SCENARIOS).map(([key, v]) => ({ key, label: v.label }));
  return res.status(200).json({ scenarios });
}

/**
 * GET /api/reports/detailed?branchId=&from=&to=&scenario=
 * Powers the interactive on-screen table preview, shown before the person
 * downloads a PDF/Excel/CSV. `scenario` narrows both the rows AND the
 * totals to just that slice (e.g. scenario=endedEarly) — see
 * gatherReportData/computeTotals.
 */
async function getDetailed(req, res) {
  try {
    const { branchId, from, to, scenario } = req.query;
    const data = await gatherReportData(req.user.companyId, branchId || null, from || null, to || null, scenario);
    return res.status(200).json(data);
  } catch (error) {
    console.error("getDetailed error:", error);
    return res.status(500).json({ message: "Server error building the detailed report." });
  }
}

/**
 * GET /api/reports/pdf?branchId=&from=&to=
 * Streams a PDF built from the exact same rows the on-screen preview shows
 * — rendered as an actual table with columns and lines, matching the
 * dashboard layout, not narrative paragraphs.
 */
function financialLabel(r) {
  if (r.financialOutcome === "paid") return `Paid ${r.amount.toLocaleString()}`;
  if (r.financialOutcome === "refunded") return `Refunded ${(r.refundAmount ?? r.amount).toLocaleString()}`;
  if (r.financialOutcome === "unpaid" || r.financialOutcome === "partial") {
    return `${r.financialOutcome === "unpaid" ? "Unpaid" : "Partial"} ${r.amount.toLocaleString()}`;
  }
  return "—";
}

function statusLabel(r) {
  let label = r.status;
  if (r.delayed) label += " · delayed";
  if (r.endedEarly) label += " · early";
  return label;
}

const STATUS_COLORS = {
  COMPLETED: "#2f6b4f",
  CANCELLED: "#a13f3f",
  EXPIRED: "#a13f3f",
  ON_HOLD: "#a3711a",
  ACTIVE: "#2a2117",
  PENDING_ARRIVAL: "#5c5340",
  AWAITING_CASHIER: "#2a2117",
};

const PDF_COLUMNS = [
  { key: "date", label: "Date", width: 62 },
  { key: "room", label: "Room", width: 58 },
  { key: "customer", label: "Customer", width: 68 },
  { key: "service", label: "Service", width: 66 },
  { key: "staff", label: "Staff", width: 60 },
  { key: "status", label: "Status", width: 64 },
  { key: "financial", label: "Financial", width: 62 },
  { key: "details", label: "Details", width: 92 },
];

/**
 * GET /api/reports/pdf?branchId=&from=&to=&scenario=
 * Streams a PDF built from the exact same rows the on-screen preview shows
 * — a branded letterhead band, colour-coded statuses for fast scanning,
 * and a real "Page X of Y" footer on every page (via bufferPages, so the
 * total is known before anything is written) — matching the dashboard's
 * layout rather than narrative paragraphs.
 */
async function downloadPdf(req, res) {
  try {
    const { branchId, from, to, scenario } = req.query;
    const data = await gatherReportData(req.user.companyId, branchId || null, from || null, to || null, scenario);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="salon-system-report-${Date.now()}.pdf"`);

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape", bufferPages: true });
    doc.pipe(res);

    const pageLeft = doc.page.margins.left;
    const pageRight = doc.page.width - doc.page.margins.right;
    const tableWidth = PDF_COLUMNS.reduce((sum, c) => sum + c.width, 0);
    const BRAND = "#8a4a2f"; // terracotta — matches the app's accent colour

    // --- Letterhead band ----------------------------------------------------
    const bandHeight = 54;
    doc.rect(0, 0, doc.page.width, bandHeight).fill(BRAND);
    doc.font("Helvetica-Bold").fontSize(17).fillColor("#fdf9f2").text("Salon System", pageLeft, 14);
    doc.font("Helvetica").fontSize(9.5).fillColor("#f3e2d6").text(
      data.scenario !== "all" ? `Filtered: ${data.scenarioLabel}` : "Service & Financial Report",
      pageLeft,
      34
    );
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#fdf9f2").text(data.branchName, 0, 14, {
      align: "right",
      width: pageRight,
    });
    doc.font("Helvetica").fontSize(8.5).fillColor("#f3e2d6").text(
      data.range.from
        ? `${data.range.from}${data.range.to && data.range.to !== data.range.from ? ` → ${data.range.to}` : ""}`
        : "All time since launch",
      0,
      30,
      { align: "right", width: pageRight }
    );
    doc.font("Helvetica").fontSize(8).fillColor("#f3e2d6").text(`Generated ${data.generatedAt.toLocaleString()}`, 0, 42, {
      align: "right",
      width: pageRight,
    });

    doc.y = bandHeight + 14;

    // --- Summary cards (mirrors the cards at the top of the dashboard) ----
    const summaryCells = [
      ["Total sessions", String(data.totals.totalSessions)],
      ["Completed", String(data.totals.completedCount)],
      ["Cancelled", String(data.totals.cancelledCount)],
      ["Expired (no-show)", String(data.totals.expiredCount)],
      ["Delayed", String(data.totals.delayedCount)],
      ["Ended early", String(data.totals.earlyEndedCount)],
      ["Received", `TZS ${data.totals.received.toLocaleString()}`],
      ["Uncollected", `TZS ${data.totals.uncollected.toLocaleString()}`],
      ["Refunded", `TZS ${data.totals.refunded.toLocaleString()}`],
      ["Net revenue", `TZS ${data.totals.net.toLocaleString()}`],
    ];
    const cardGap = 6;
    const cardsPerRow = 5;
    const cardWidth = (tableWidth - cardGap * (cardsPerRow - 1)) / cardsPerRow;
    const cardHeight = 34;
    let sx = pageLeft;
    let sy = doc.y;
    summaryCells.forEach(([label, value], i) => {
      if (i > 0 && i % cardsPerRow === 0) {
        sy += cardHeight + cardGap;
        sx = pageLeft;
      }
      doc.rect(sx, sy, cardWidth, cardHeight).fill("#faf7f0");
      doc.rect(sx, sy, 2.5, cardHeight).fill(BRAND);
      doc.font("Helvetica").fontSize(6.8).fillColor("#7a6a52").text(label, sx + 8, sy + 6, { width: cardWidth - 12 });
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#1a1410").text(value, sx + 8, sy + 17, { width: cardWidth - 12 });
      sx += cardWidth + cardGap;
    });
    doc.y = sy + cardHeight + 16;

    // --- Table --------------------------------------------------------------
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#1a1410").text("Service Scenarios", pageLeft, doc.y);
    doc.moveDown(0.3);

    const rowHeight = 16;
    const headerHeight = 18;
    const tableTop = 40; // where a table restarts on a continuation page

    function drawTableHeader(y) {
      let x = pageLeft;
      doc.rect(pageLeft, y, tableWidth, headerHeight).fill(BRAND);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#fdf9f2");
      PDF_COLUMNS.forEach((col) => {
        doc.text(col.label, x + 3, y + 5, { width: col.width - 6 });
        x += col.width;
      });
      doc.rect(pageLeft, y, tableWidth, headerHeight).strokeColor(BRAND).lineWidth(0.5).stroke();
      return y + headerHeight;
    }

    function drawRowDivider(x, y) {
      doc.strokeColor("#e3dac6").lineWidth(0.5);
      doc.moveTo(x, y).lineTo(x + tableWidth, y).stroke();
    }

    let cursorY = drawTableHeader(doc.y);

    if (data.rows.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor("#777").text("No sessions recorded in this period.", pageLeft, cursorY + 6);
    } else {
      data.rows.forEach((r, idx) => {
        if (cursorY + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
          cursorY = drawTableHeader(tableTop);
        }

        if (idx % 2 === 1) {
          doc.rect(pageLeft, cursorY, tableWidth, rowHeight).fill("#faf7f0");
        }

        const cellValues = {
          date: new Date(r.registeredAt).toLocaleDateString(),
          room: r.room,
          customer: r.customerName,
          service: r.service,
          staff: r.staff,
          status: statusLabel(r),
          financial: financialLabel(r),
          details: r.details,
        };

        let x = pageLeft;
        PDF_COLUMNS.forEach((col) => {
          doc.font(col.key === "status" ? "Helvetica-Bold" : "Helvetica").fontSize(7);
          doc.fillColor(col.key === "status" ? STATUS_COLORS[r.status] || "#2a2117" : "#2a2117");
          doc.text(String(cellValues[col.key] ?? "—"), x + 3, cursorY + 4, {
            width: col.width - 6,
            height: rowHeight - 4,
            ellipsis: true,
          });
          x += col.width;
        });

        drawRowDivider(pageLeft, cursorY + rowHeight);
        cursorY += rowHeight;
      });
    }

    // --- Footer on every page: "Page X of Y" + confidentiality note -------
    const pageRange = doc.bufferedPageRange();
    for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - doc.page.margins.bottom + 6;
      doc.font("Helvetica").fontSize(7.5).fillColor("#9a8f78");
      doc.text("Salon System — internal report, confidential", pageLeft, footerY, { width: tableWidth / 2 });
      doc.text(`Page ${i - pageRange.start + 1} of ${pageRange.count}`, pageLeft, footerY, {
        width: tableWidth,
        align: "right",
      });
    }

    doc.end();
  } catch (error) {
    console.error("downloadPdf error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error generating the PDF report." });
    } else {
      res.end();
    }
  }
}

/** Escapes a value for a CSV cell: wraps in quotes and doubles any inner quotes. */
function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "room", label: "Room" },
  { key: "customer", label: "Customer" },
  { key: "service", label: "Service" },
  { key: "staff", label: "Staff" },
  { key: "status", label: "Status" },
  { key: "financialOutcome", label: "Financial outcome" },
  { key: "amount", label: "Amount" },
  { key: "refundAmount", label: "Refund amount" },
  { key: "details", label: "Details" },
  { key: "cancelReason", label: "Cancel reason" },
  { key: "cashier", label: "Cashier" },
];

/**
 * GET /api/reports/csv?branchId=&from=&to=&scenario=
 * Streams the same rows as /detailed and /pdf, as a CSV file — same
 * source data (gatherReportData), so the three exports never drift apart.
 * Read-only: this endpoint never writes to the database, so it's safe for
 * several people signed into the same account to generate reports (even
 * overlapping date ranges) at the same time without stepping on each
 * other — each request just computes its own snapshot from the DB.
 */
async function downloadCsv(req, res) {
  try {
    const { branchId, from, to, scenario } = req.query;
    const data = await gatherReportData(req.user.companyId, branchId || null, from || null, to || null, scenario);

    const lines = [];
    lines.push(CSV_COLUMNS.map((c) => csvCell(c.label)).join(","));

    data.rows.forEach((r) => {
      const cellValues = {
        date: new Date(r.registeredAt).toLocaleString(),
        room: r.room,
        customer: r.customerName,
        service: r.service,
        staff: r.staff,
        status: statusLabel(r),
        financialOutcome: r.financialOutcome === "n/a" ? "" : r.financialOutcome,
        amount: r.amount,
        refundAmount: r.refundAmount ?? "",
        details: r.details,
        cancelReason: r.cancelReason || "",
        cashier: r.cashier === "—" ? "" : r.cashier,
      };

      lines.push(CSV_COLUMNS.map((c) => csvCell(cellValues[c.key])).join(","));
    });

    // Totals summary appended after a blank line, mirroring the PDF's summary strip.
    lines.push("");
    lines.push("Summary");
    lines.push(`Branch,${csvCell(data.branchName)}`);
    lines.push(`Scenario filter,${csvCell(data.scenarioLabel)}`);
    lines.push(
      `Period,${csvCell(data.range.from ? `${data.range.from} to ${data.range.to || data.range.from}` : "All time since launch")}`
    );
    lines.push(`Total sessions,${data.totals.totalSessions}`);
    lines.push(`Completed,${data.totals.completedCount}`);
    lines.push(`Cancelled,${data.totals.cancelledCount}`);
    lines.push(`Expired (no-show),${data.totals.expiredCount}`);
    lines.push(`Delayed,${data.totals.delayedCount}`);
    lines.push(`Ended early,${data.totals.earlyEndedCount}`);
    lines.push(`Received,${data.totals.received}`);
    lines.push(`Uncollected,${data.totals.uncollected}`);
    lines.push(`Refunded,${data.totals.refunded}`);
    lines.push(`Net revenue,${data.totals.net}`);

    // A UTF-8 BOM keeps Excel from mangling non-ASCII customer/staff names.
    const csvBody = "\uFEFF" + lines.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="salon-system-report-${Date.now()}.csv"`);
    return res.status(200).send(csvBody);
  } catch (error) {
    console.error("downloadCsv error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error generating the CSV report." });
    } else {
      res.end();
    }
  }
}


module.exports = { getSummary, getDetailed, downloadPdf, downloadCsv, listScenarios };
