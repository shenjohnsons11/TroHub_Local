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

  if (![0, 4, 5].includes(Number(contract.status))) {
    throw createContractSigningError(
      "CONTRACT_NOT_SIGNABLE",

      "Hợp đồng không ở trạng thái chờ ký hoặc chờ bàn giao.",

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

  /*
   * =========================================================
   * HỢP ĐỒNG ĐÃ Ở TRẠNG THÁI RESERVED
   * =========================================================
   *
   * Trường hợp API được gọi lại:
   * - Không tạo lại hóa đơn
   * - Không ghi đè thời gian ký cũ
   * - Nếu chưa có chữ ký thì mới lưu chữ ký
   */

  if (Number(contract.status) === 4 && (depositAmount === 0 || depositInvoice)) {
    if (signature && !contract.tenantSignature) {
      const signedTime =
        contract.tenantConfirmedAt ||
        contract.signedAt ||
        new Date();

      contract.tenantSignature = signature;

      if (!contract.tenantConfirmedAt) {
        contract.tenantConfirmedAt = signedTime;
      }

      if (!contract.signedAt) {
        contract.signedAt = signedTime;
      }

      await contract.save();

      try {
        const { generateContractPdf } = require("./contractGeneratorService");

        await generateContractPdf(contract._id, signature);
      } catch (genErr) {
        console.log("[Contract Document Generation]", genErr.message);
      }
    }

    return buildSigningResult(contract, depositInvoice, true);
  }

  let createdInvoice = null;

  /*
   * =========================================================
   * TẠO HÓA ĐƠN TIỀN CỌC
   * =========================================================
   */

  if (depositAmount > 0 && !depositInvoice) {
    const room = await RoomModel.findById(contract.roomId);

    const invoiceCode = await allocateInvoiceCode(
      {
        period: "Tiền cọc",

        roomCode: room?.roomCode,
      },
      {
        exists:
          typeof InvoiceModel.exists === "function"
            ? (code) =>
                InvoiceModel.exists({
                  invoiceCode: code,
                })
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
      if (error?.code !== 11000) {
        throw error;
      }

      depositInvoice = await InvoiceModel.findOne({
        contractId: contract._id,

        period: "Tiền cọc",
      });

      if (!depositInvoice) {
        throw error;
      }
    }
  }

  /*
   * =========================================================
   * LƯU TRẠNG THÁI + CHỮ KÝ + THỜI GIAN KÝ
   * =========================================================
   */

  const previousStatus = contract.status;

  const previousConfirmedAt = contract.tenantConfirmedAt;

  const previousSignedAt = contract.signedAt;

  const previousTenantSignature = contract.tenantSignature;

  /*
   * Dùng DUY NHẤT một thời điểm cho:
   *
   * tenantConfirmedAt
   * signedAt
   *
   * Như vậy ngày/giờ hiển thị trên hợp đồng là chính xác
   * và không lệch vài mili giây giữa hai field.
   */

  const signedTime =
    contract.tenantConfirmedAt ||
    contract.signedAt ||
    new Date();

  /*
   * Sau khi Tenant ký, mọi hợp đồng chờ kích hoạt đi qua RESERVED
   * để Landlord xác nhận tiền cọc và bàn giao cùng số điện nước đầu vào.
   */

  contract.status = 4;

  if (!contract.tenantConfirmedAt) {
    contract.tenantConfirmedAt = signedTime;
  }

  if (signature) {
    contract.tenantSignature = signature;

    /*
     * QUAN TRỌNG:
     * Chỉ lưu signedAt nếu trước đó chưa tồn tại.
     *
     * Không được:
     * contract.signedAt = new Date();
     *
     * mỗi lần gọi lại API vì sẽ làm thay đổi thời gian ký thật.
     */

    if (!contract.signedAt) {
      contract.signedAt = signedTime;
    }
  }

  try {
    await contract.save();

    /*
     * Sau khi thời gian ký đã được lưu DB
     * mới tạo PDF.
     *
     * Như vậy PDF có thể đọc signedAt chính xác.
     */

    try {
      const { generateContractPdf } = require("./contractGeneratorService");

      await generateContractPdf(contract._id, signature);
    } catch (genErr) {
      console.log("[Contract Document Generation]", genErr.message);
    }
  } catch (error) {
    /*
     * Restore trạng thái object nếu save thất bại.
     */

    contract.status = previousStatus;

    contract.tenantConfirmedAt = previousConfirmedAt;

    contract.signedAt = previousSignedAt;

    contract.tenantSignature = previousTenantSignature;

    /*
     * Nếu hóa đơn tiền cọc vừa được tạo nhưng hợp đồng lưu thất bại
     * thì rollback hóa đơn.
     */

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