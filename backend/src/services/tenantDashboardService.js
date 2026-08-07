const PropertyMembership = require('../models/PropertyMembership');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const RepairRequest = require('../models/RepairRequest');
const Notification = require('../models/Notification');

const OPEN_CONTRACT_STATUSES = [0, 1, 4, 5];

function idOf(value) {
    return String(value?._id || value || '');
}

async function buildTenantDashboard(tenantId, dependencies = {}) {
    const {
        MembershipModel = PropertyMembership,
        ContractModel = Contract,
        InvoiceModel = Invoice,
        RepairModel = RepairRequest,
        NotificationModel = Notification,
    } = dependencies;
    const memberships = await MembershipModel.find({ tenantId })
        .populate('propertyId', 'name address status')
        .sort({ createdAt: -1 })
        .lean();
    const activeMemberships = memberships.filter((item) => item.status === 'active' && item.propertyId?.status === 'active');
    const invitations = memberships
        .filter((item) => item.status === 'invited' && item.propertyId)
        .map((item) => ({ id: idOf(item), propertyId: idOf(item.propertyId), name: item.propertyId.name, address: item.propertyId.address }));
    if (!activeMemberships.length) {
        return { totals: { unpaidAmount: 0, dueInvoiceCount: 0, openContracts: 0, openRepairCount: 0 }, invitations, properties: [], notifications: [] };
    }

    const contracts = await ContractModel.find({ tenantId, status: { $in: OPEN_CONTRACT_STATUSES } })
        .populate({ path: 'roomId', select: 'roomCode propertyId' })
        .lean();
    const contractIds = contracts.map((item) => item._id);
    const [invoices, repairs, notifications] = await Promise.all([
        InvoiceModel.find({ contractId: { $in: contractIds }, status: { $in: [1, 3] } }).lean(),
        RepairModel.find({ tenantId, contractId: { $in: contractIds }, status: { $in: [0, 1] } }).lean(),
        NotificationModel.find({ recipientId: tenantId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const propertyById = new Map(activeMemberships.map((item) => [idOf(item.propertyId), item.propertyId]));
    const propertyForContract = (contract) => idOf(contract.roomId?.propertyId);
    const properties = activeMemberships.map((membership) => {
        const property = membership.propertyId;
        const propertyId = idOf(property);
        const propertyContracts = contracts.filter((contract) => propertyForContract(contract) === propertyId);
        const propertyContractIds = propertyContracts.map((contract) => idOf(contract));
        const propertyInvoices = invoices.filter((invoice) => propertyContractIds.includes(idOf(invoice.contractId)));
        const propertyRepairs = repairs.filter((repair) => propertyContractIds.includes(idOf(repair.contractId)));
        const room = propertyContracts[0]?.roomId || null;
        return {
            id: propertyId,
            name: property.name,
            address: property.address,
            label: `${property.name} · ${room?.roomCode || 'Chưa được xếp phòng'}`,
            room: room ? { id: idOf(room), roomCode: room.roomCode } : null,
            contract: propertyContracts[0] ? { id: idOf(propertyContracts[0]), status: propertyContracts[0].status, endDate: propertyContracts[0].endDate } : null,
            unpaidAmount: propertyInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
            dueInvoiceCount: propertyInvoices.length,
            openRepairCount: propertyRepairs.length,
        };
    });
    const notificationSummaries = notifications.map((item) => {
        const propertyId = idOf(item.metadata?.propertyId);
        const property = propertyById.get(propertyId);
        return {
            id: idOf(item), title: item.title, content: item.content || item.message || '', category: item.category || 'system',
            deepLink: item.deepLink || '', metadata: item.metadata || {}, isRead: Boolean(item.isRead), createdAt: item.createdAt,
            propertyId: propertyId || undefined,
            propertyLabel: property ? property.name : 'Nhà trọ cũ · Không rõ phòng',
        };
    });
    return {
        totals: {
            unpaidAmount: properties.reduce((sum, item) => sum + item.unpaidAmount, 0),
            dueInvoiceCount: properties.reduce((sum, item) => sum + item.dueInvoiceCount, 0),
            openContracts: contracts.length,
            openRepairCount: properties.reduce((sum, item) => sum + item.openRepairCount, 0),
        },
        invitations,
        properties,
        notifications: notificationSummaries,
    };
}

module.exports = { buildTenantDashboard };
