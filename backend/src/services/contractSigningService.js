const Contract = require("../models/Contract");
const Invoice = require("../models/Invoice");
const Room = require("../models/Room");
const { allocateInvoiceCode } = require("./invoiceCode");

function createContractSigningError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function toId(value) {
  if (value && typeof value === "object" && value._id) {
    return String(value._id);
  }
  return String(value || "");
}

function buildSigningResult(contract, invoice, idempotent) {
  const depositAmount = Math.max(Number(contract.fixedDeposit) || 0, 0);
  return {
    contract,
    invoiceId: invoice ? toId(invoice._id) : null,
    depositRequired: depositAmount > 0,
    depositAmount,
    idempotent,
  };
}

async function signContractAndEnsureDeposit({
  contractId,
  nguoiThueId,
  signature,
  ContractModel = Contract,
  InvoiceModel = Invoice,
  RoomModel = Room,
}) {
  const contract = await ContractModel.findById(contractId);
  if (!contract) {
    throw createContractSigningError(
      "CONTRACT_NOT_FOUND",
      "Không tìm thấy hợp đồng.",
      404,
    );
  }

  if (toId(contract.tenantId) !== toId(nguoiThueId)) {
    throw createContractSigningError(
      "CONTRACT_FORBIDDEN",
      "Người thuê không có quyền ký hợp đồng này.",
      403,
    );
  }

  if (![0, 4].includes(Number(contract.status))) {
    throw createContractSigningError(
      "CONTRACT_NOT_SIGNABLE",
      "Hợp đồng không ở trạng thái có thể ký.",
      409,
    );
  }

  const depositAmount = Math.max(Number(contract.fixedDeposit) || 0, 0);
  let depositInvoice = null;
  if (depositAmount > 0) {
    depositInvoice = await InvoiceModel.findOne({
      contractId: contract._id,
      period: "Tiền cọc",
    });
  }

  if (Number(contract.status) === 4 && (depositAmount === 0 || depositInvoice)) {
    if (signature && !contract.tenantSignature) {
      contract.tenantSignature = signature;
      contract.signedAt = new Date();
      await contract.save();
      try {
        const { generateContractDocuments } = require("./contractGeneratorService");
        await generateContractDocuments(contract._id, signature);
      } catch (genErr) {
        console.log("[Contract Document Generation]", genErr.message);
      }
    }
    return buildSigningResult(contract, depositInvoice, true);
  }

  let createdInvoice = null;
  if (depositAmount > 0 && !depositInvoice) {
    const room = await RoomModel.findById(contract.roomId);
    const invoiceCode = await allocateInvoiceCode(
      { period: "Tiền cọc", roomCode: room?.roomCode },
      {
        exists: typeof InvoiceModel.exists === "function"
          ? (code) => InvoiceModel.exists({ invoiceCode: code })
          : async () => false,
      },
    );
    try {
      createdInvoice = await InvoiceModel.create({
        invoiceCode,
        contractId: contract._id,
        period: "Tiền cọc",
        dueDate: new Date(),
        issuedAt: new Date(),
        totalAmount: depositAmount,
        status: 1,
        room: room?.roomCode || "",
        tenant: toId(contract.tenantId),
      });
      depositInvoice = createdInvoice;
    } catch (error) {
      if (error?.code !== 11000) throw error;
      depositInvoice = await InvoiceModel.findOne({
        contractId: contract._id,
        period: "Tiền cọc",
      });
      if (!depositInvoice) throw error;
    }
  }

  const previousStatus = contract.status;
  const previousConfirmedAt = contract.tenantConfirmedAt;
  contract.status = 4;
  contract.tenantConfirmedAt = new Date();
  if (signature) {
    contract.tenantSignature = signature;
    contract.signedAt = new Date();
  }
  try {
    await contract.save();
    try {
      const { generateContractDocuments } = require("./contractGeneratorService");
      await generateContractDocuments(contract._id, signature);
    } catch (genErr) {
      console.log("[Contract Document Generation]", genErr.message);
    }
  } catch (error) {
    contract.status = previousStatus;
    contract.tenantConfirmedAt = previousConfirmedAt;
    if (createdInvoice) {
      await InvoiceModel.findByIdAndDelete(createdInvoice._id);
    }
    throw error;
  }

  return buildSigningResult(contract, depositInvoice, false);
}

async function buildDepositPayment(contract, InvoiceModel = Invoice) {
  const amount = Math.max(Number(contract.fixedDeposit) || 0, 0);
  if (amount === 0) {
    return {
      required: false,
      invoiceId: null,
      amount: 0,
      status: "not_required",
    };
  }
  const invoice = await InvoiceModel.findOne({
    contractId: contract._id,
    period: "Tiền cọc",
  });
  return {
    required: true,
    invoiceId: invoice ? toId(invoice._id) : null,
    amount,
    status: invoice?.status === 2 ? "paid" : "unpaid",
  };
}

module.exports = {
  buildDepositPayment,
  buildSigningResult,
  createContractSigningError,
  signContractAndEnsureDeposit,
};
