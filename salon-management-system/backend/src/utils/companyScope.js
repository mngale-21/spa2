// ============================================================================
// Company Scope — the single place that enforces multi-tenant data
// isolation. EVERY controller function that receives a resource id (branch,
// room, service, session, transaction, employee, customer, notification,
// assignment) from the client MUST run it through the matching assert*
// function here before reading or writing it. A client-supplied id that
// belongs to a DIFFERENT company always resolves to "not found" (404) —
// never "forbidden" (403) — so we never even confirm that another
// company's record exists.
//
// This is what makes Company A unable to see/edit/delete Company B's data
// no matter what ids it sends manually, per the platform's core isolation
// requirement.
// ============================================================================

const prisma = require("../config/prismaClient");

async function assertBranchInCompany(branchId, companyId) {
  if (!branchId) return null;
  const branch = await prisma.branch.findFirst({ where: { id: branchId, companyId } });
  return branch; // null if not found OR belongs to another company
}

async function assertRoomInCompany(roomId, companyId) {
  if (!roomId) return null;
  const room = await prisma.room.findFirst({
    where: { id: roomId, branch: { companyId } },
    include: { branch: true },
  });
  return room;
}

async function assertServiceInCompany(serviceId, companyId) {
  if (!serviceId) return null;
  return prisma.service.findFirst({ where: { id: serviceId, branch: { companyId } } });
}

async function assertSessionInCompany(sessionId, companyId) {
  if (!sessionId) return null;
  return prisma.session.findFirst({ where: { id: sessionId, branch: { companyId } } });
}

async function assertTransactionInCompany(transactionId, companyId) {
  if (!transactionId) return null;
  return prisma.transaction.findFirst({ where: { id: transactionId, branch: { companyId } } });
}

async function assertAssignmentInCompany(assignmentId, companyId) {
  if (!assignmentId) return null;
  return prisma.roomAssignment.findFirst({
    where: { id: assignmentId, room: { branch: { companyId } } },
  });
}

async function assertEmployeeInCompany(userId, companyId) {
  if (!userId) return null;
  return prisma.user.findFirst({ where: { id: userId, companyId } });
}

async function assertCustomerInCompany(customerId, companyId) {
  if (!customerId) return null;
  return prisma.customer.findFirst({ where: { id: customerId, branch: { companyId } } });
}

async function assertNotificationInCompany(notificationId, companyId) {
  if (!notificationId) return null;
  // Notifications may be branch-scoped OR user-scoped with no branchId
  // (e.g. targeted at one user by userId only) — cover both by checking
  // either the branch's company or the target user's company.
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      OR: [{ branch: { companyId } }, { user: { companyId } }],
    },
  });
}

// Every branch id belonging to a company — used by list-style queries that
// aggregate "everything across my company's branches" (reports, employee
// directory, etc.) instead of a single branchId.
async function getCompanyBranchIds(companyId) {
  const branches = await prisma.branch.findMany({ where: { companyId }, select: { id: true } });
  return branches.map((b) => b.id);
}

module.exports = {
  assertBranchInCompany,
  assertRoomInCompany,
  assertServiceInCompany,
  assertSessionInCompany,
  assertTransactionInCompany,
  assertAssignmentInCompany,
  assertEmployeeInCompany,
  assertCustomerInCompany,
  assertNotificationInCompany,
  getCompanyBranchIds,
};
