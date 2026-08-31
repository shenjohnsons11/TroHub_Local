const Account = require('../models/Account');
const BillingPolicy = require('../models/BillingPolicy');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const RepairRequest = require('../models/RepairRequest');
const Room = require('../models/Room');
const { buildDashboardStats } = require('../services/dashboardStats');

function createDashboardDependencies() {
    return {
        listRooms: (landlordId) => Room.find({ landlordId }).lean(),
        listContracts: async (landlordId) => {
            const roomIds = await Room.find({ landlordId }).distinct('_id');
            return Contract.find({ roomId: { $in: roomIds } })
                .populate('tenantId', 'fullName')
                .populate('services.serviceId', 'name code type billingMode')
                .lean();
        },
        listInvoices: async (landlordId) => {
            const roomIds = await Room.find({ landlordId }).distinct('_id');
            const contractIds = await Contract.find({ roomId: { $in: roomIds } }).distinct('_id');
            return Invoice.find({ contractId: { $in: contractIds }, status: { $in: [1, 2, 3] } })
                .select([
                    'contractId', 'period', 'status', 'totalAmount', 'roomAmount',
                    'electricity', 'water', 'services', 'parking', 'internet', 'garbage',
                    'electricityOld', 'electricityNew', 'waterOld', 'waterNew',
                    'details', 'dueDate', 'updatedAt',
                ].join(' '))
                .lean();
        },
        countTenants: (landlordId) => Account.countDocuments({
            role: 2,
            status: 1,
            linkedLandlords: landlordId,
        }),
        countPendingRepairs: async (landlordId) => {
            const roomIds = await Room.find({ landlordId }).distinct('_id');
            const tenantIds = await Contract.find({ roomId: { $in: roomIds } }).distinct('tenantId');
            return RepairRequest.countDocuments({
                tenantId: { $in: tenantIds },
                status: { $in: [0, 1] },
            });
        },
        getBillingPolicy: (landlordId) => BillingPolicy.findOne({ landlordId }).lean(),
    };
}

exports.getStats = async (req, res) => {
    try {
        const data = await buildDashboardStats({
            landlordId: req.auth.id,
            months: req.query.months,
        }, createDashboardDependencies());
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Không thể tải dữ liệu dashboard: ${error.message}`,
        });
    }
};
