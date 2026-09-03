const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');
const { resolveContractMeterSnapshot } = require('./contractTerms');
const {
    calculateMeterCharge,
    parseNonNegativeFinite,
    roundVnd,
} = require('./invoiceCalculator');

class CheckoutError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'CheckoutError';
        this.status = status;
        this.code = code;
    }
}

function calculateCheckoutSettlement(contract, previousInvoice, input, unpaidAmountInput = 0, roomSnapshot = null) {
    const meter = resolveContractMeterSnapshot(contract, previousInvoice, roomSnapshot);
    const electricity = calculateMeterCharge({
        label: 'Điện',
        oldIndex: meter.electricityOld,
        newIndex: input.finalElectricity,
        unitPrice: meter.electricityPrice,
    });
    const water = calculateMeterCharge({
        label: 'Nước',
        oldIndex: meter.waterOld,
        newIndex: input.finalWater,
        unitPrice: meter.waterPrice,
    });
    const originalDeposit = roundVnd(parseNonNegativeFinite(
        contract.fixedDeposit,
        'fixedDeposit',
        'Tiền cọc'
    ));
    const isDepositForfeited = Boolean(input.forfeitDeposit);
    const depositAmount = isDepositForfeited ? 0 : originalDeposit;

    const damageAmount = roundVnd(parseNonNegativeFinite(
        input.damageAmount ?? input.deductionAmount ?? 0,
        'damageAmount',
        'Tiền bồi thường hư hại'
    ));
    const unpaidAmount = roundVnd(parseNonNegativeFinite(
        unpaidAmountInput,
        'unpaidAmount',
        'Hóa đơn nợ cũ'
    ));
    const utilitiesAmount = roundVnd(electricity.amount + water.amount);
    const totalDebt = roundVnd(unpaidAmount + utilitiesAmount + damageAmount);
    const balance = roundVnd(depositAmount - totalDebt);

    return {
        electricityOld: electricity.oldIndex,
        electricityNew: electricity.newIndex,
        electricityPrice: electricity.unitPrice,
        electricityUsage: electricity.usage,
        electricityAmount: electricity.amount,
        waterOld: water.oldIndex,
        waterNew: water.newIndex,
        waterPrice: water.unitPrice,
        waterUsage: water.usage,
        waterAmount: water.amount,
        utilitiesAmount,
        depositAmount: originalDeposit,
        forfeitDeposit: isDepositForfeited,
        unpaidAmount,
        damageAmount,
        totalDebt,
        refundAmount: Math.max(0, balance),
        amountDue: Math.max(0, -balance),
        note: typeof input.note === 'string' ? input.note.trim() : '',
        terminationReason: typeof input.terminationReason === 'string' && input.terminationReason.trim()
            ? input.terminationReason.trim()
            : (isDepositForfeited ? 'Chủ trọ đơn phương chấm dứt (Khách vi phạm điều khoản)' : (contract.checkoutRequestedAt ? 'Khách yêu cầu trả phòng' : 'Chủ trọ thanh lý hợp đồng')),
    };
}

async function getOutstandingDebt(InvoiceModel, contractId, session = null) {
    const invoices = await InvoiceModel.find({
        contractId,
        status: { $in: [1, 3] },
        period: { $nin: ['Tiền cọc', 'final_invoice'] },
    }).session(session);
    return {
        invoices,
        totalAmount: roundVnd(invoices.reduce(
            (sum, invoice) => sum + Number(invoice.totalAmount || 0),
            0
        )),
    };
}

async function getCheckoutPreview({
    contractId,
    adminId,
    ContractModel = Contract,
    RoomModel = Room,
    InvoiceModel = Invoice,
}) {
    const contract = await ContractModel.findById(contractId).session(null);
    if (!contract) {
        throw new CheckoutError(404, 'CONTRACT_NOT_FOUND', 'Không tìm thấy hợp đồng.');
    }
    // Cho phép quyết toán nếu khách có yêu cầu hoặc hợp đồng đang có hiệu lực (chủ trọ chủ động thanh lý)
    if (contract.status !== 1 && !contract.checkoutRequestedAt) {
        throw new CheckoutError(400, 'CONTRACT_NOT_ACTIVE', 'Chỉ hợp đồng đang có hiệu lực mới có thể quyết toán trả phòng.');
    }

    const room = await RoomModel.findOne({ _id: contract.roomId, landlordId: adminId }).session(null);
    if (!room) {
        throw new CheckoutError(403, 'ROOM_ACCESS_DENIED', 'Bạn không có quyền xem quyết toán này.');
    }

    const previousInvoice = await InvoiceModel.findOne({
        contractId: contract._id,
        period: { $nin: ['Tiền cọc', 'final_invoice'] },
        status: { $in: [1, 2, 3] },
    }).sort({ createdAt: -1 }).session(null);
    const meter = resolveContractMeterSnapshot(contract, previousInvoice, room);
    const debt = await getOutstandingDebt(InvoiceModel, contract._id);

    return {
        roomCode: room.roomCode,
        depositAmount: roundVnd(Number(contract.fixedDeposit) || 0),
        unpaidAmount: debt.totalAmount,
        electricityOld: meter.electricityOld,
        waterOld: meter.waterOld,
        electricityPrice: meter.electricityPrice,
        waterPrice: meter.waterPrice,
        checkoutRequestedAt: contract.checkoutRequestedAt || null,
    };
}

async function checkoutContract({
    contractId,
    adminId,
    input,
    mongooseInstance = mongoose,
    ContractModel = Contract,
    RoomModel = Room,
    InvoiceModel = Invoice,
}) {
    const session = await mongooseInstance.startSession();
    let result;

    try {
        await session.withTransaction(async () => {
            const contract = await ContractModel.findById(contractId).session(session);
            if (!contract) {
                throw new CheckoutError(404, 'CONTRACT_NOT_FOUND', 'Không tìm thấy hợp đồng.');
            }
            if (contract.status !== 1 && !contract.checkoutRequestedAt) {
                throw new CheckoutError(
                    400,
                    'CONTRACT_NOT_ACTIVE',
                    'Chỉ hợp đồng đang có hiệu lực mới có thể quyết toán trả phòng.'
                );
            }

            const room = await RoomModel.findOne({
                _id: contract.roomId,
                landlordId: adminId,
            }).session(session);
            if (!room) {
                throw new CheckoutError(403, 'ROOM_ACCESS_DENIED', 'Bạn không có quyền duyệt trả phòng này.');
            }

            const previousInvoice = await InvoiceModel.findOne({
                contractId: contract._id,
                period: { $nin: ['Tiền cọc', 'final_invoice'] },
                status: { $in: [1, 2, 3] },
            }).sort({ createdAt: -1 }).session(session);
            const debt = await getOutstandingDebt(InvoiceModel, contract._id, session);
            const settlement = calculateCheckoutSettlement(
                contract,
                previousInvoice,
                input,
                debt.totalAmount,
                room
            );

            if (debt.invoices.length) {
                await InvoiceModel.updateMany(
                    { _id: { $in: debt.invoices.map((invoice) => invoice._id) } },
                    { $set: { status: 4 } },
                    { session }
                );
            }

            let finalInvoice = null;
            if (settlement.amountDue > 0) {
                [finalInvoice] = await InvoiceModel.create([{
                    contractId: contract._id,
                    period: 'final_invoice',
                    issuedAt: new Date(),
                    dueDate: new Date(),
                    totalAmount: settlement.amountDue,
                    status: 1,
                    room: room.roomCode || '',
                    note: 'Công nợ còn lại sau quyết toán trả phòng và cấn trừ tiền cọc.',
                }], { session });
            }
            settlement.finalInvoiceId = finalInvoice?._id || null;

            contract.status = 3;
            contract.checkoutRequestedAt = undefined;
            contract.checkoutSettlement = {
                ...settlement,
                approvedBy: adminId,
                approvedAt: new Date(),
            };
            room.status = 0;
            room.lastElectricityReading = settlement.electricityNew;
            room.lastWaterReading = settlement.waterNew;
            room.draftElectricity = undefined;
            room.draftWater = undefined;

            await contract.save({ session });
            await room.save({ session });
            result = {
                contract,
                room,
                settlement,
                tenantId: contract.tenantId,
                roomCode: room.roomCode,
            };
        });
    } finally {
        await session.endSession();
    }

    return result;
}

module.exports = {
    CheckoutError,
    calculateCheckoutSettlement,
    checkoutContract,
    getCheckoutPreview,
    getOutstandingDebt,
};
