const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Invoice = require("../models/Invoice");
const { notifyLandlord } = require("../services/landlordNotificationService");

const TOKEN_TTL_SECONDS = 300;
const issuedTokens = new Map();

const normalize = (value) => {
    return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
};

const successResponse = (reftransactionid, message = "Transaction processed successfully") => {
    return {
        error: false,
        errorReason: null,
        toastMessage: message,
        object: {
            reftransactionid
        }
    };
};

const errorResponse = (reason, message) => {
    return {
        error: true,
        errorReason: reason,
        toastMessage: message,
        object: null
    };
};

const parseBasicAuth = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return null;
    }

    const base64Credentials = authHeader.replace("Basic ", "").trim();
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");

    const separatorIndex = credentials.indexOf(":");

    if (separatorIndex === -1) {
        return null;
    }

    return {
        username: credentials.slice(0, separatorIndex),
        password: credentials.slice(separatorIndex + 1)
    };
};

const isValidBearerToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return false;
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const expiresAt = issuedTokens.get(token);

    if (!expiresAt) {
        return false;
    }

    if (Date.now() > expiresAt) {
        issuedTokens.delete(token);
        return false;
    }

    return true;
};

// POST /vqr/api/token_generate
exports.generateToken = async (req, res) => {
    try {
        const auth = parseBasicAuth(req.headers.authorization);

        const expectedUsername = process.env.VQR_BASIC_USERNAME;
        const expectedPassword = process.env.VQR_BASIC_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
            return res.status(500).json({
                status: "FAILED",
                message: "MISSING_VQR_BASIC_CONFIG"
            });
        }

        if (
            !auth ||
            auth.username !== expectedUsername ||
            auth.password !== expectedPassword
        ) {
            return res.status(401).json({
                status: "FAILED",
                message: "INVALID_BASIC_AUTH"
            });
        }

        const accessToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = Date.now() + TOKEN_TTL_SECONDS * 1000;

        issuedTokens.set(accessToken, expiresAt);

        return res.status(200).json({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: TOKEN_TTL_SECONDS
        });
    } catch (error) {
        console.error("VietQR generate token error:", error);
        return res.status(500).json({
            status: "FAILED",
            message: "SERVER_ERROR"
        });
    }
};

// POST /vqr/bank/api/transaction-sync
exports.transactionSync = async (req, res) => {
    try {
        const isAuthorized = isValidBearerToken(req.headers.authorization);

        if (!isAuthorized) {
            return res.status(401).json(
                errorResponse(
                    "INVALID_TOKEN",
                    "Authorization header is missing, invalid or expired"
                )
            );
        }

        const body = req.body || {};

        const bankaccount = body.bankaccount;
        const amount = Number(body.amount);
        const transType = String(body.transType || "C").toUpperCase();
        const content = body.content || "";
        const transactionid = body.transactionid || body.transactionId;
        const referencenumber = body.referencenumber || body.referenceNumber;
        const orderId = body.orderId || body.orderID;

        if (transType !== "C") {
            return res.status(400).json(
                errorResponse(
                    "INVALID_TRANSACTION_TYPE",
                    "Only credit transactions are accepted"
                )
            );
        }

        if (!amount || amount <= 0) {
            return res.status(400).json(
                errorResponse(
                    "INVALID_AMOUNT",
                    "Amount is required and must be greater than zero"
                )
            );
        }

        if (!content && !orderId) {
            return res.status(400).json(
                errorResponse(
                    "MISSING_CONTENT",
                    "Content or orderId is required"
                )
            );
        }

        const normalizedContent = normalize(content);
        const normalizedOrderId = normalize(orderId);

        const pendingTransactions = await Transaction.find({
            method: "VietQR",
            status: 2,
            amount
        }).sort({ createdAt: -1 });

        const transaction = pendingTransactions.find((item) => {
            const code1 = normalize(item.orderCode);
            const code2 = normalize(item.description);

            return (
                (code1 && normalizedContent.includes(code1)) ||
                (code2 && normalizedContent.includes(code2)) ||
                (normalizedOrderId && code1 && normalizedOrderId.includes(code1)) ||
                (normalizedOrderId && code2 && normalizedOrderId.includes(code2))
            );
        });

        if (!transaction) {
            return res.status(400).json(
                errorResponse(
                    "TRANSACTION_NOT_FOUND",
                    "No pending transaction matched content/orderId and amount"
                )
            );
        }

        if (transaction.status === 1) {
            return res.status(200).json(
                successResponse(
                    transaction._id.toString(),
                    "Transaction already processed"
                )
            );
        }

        transaction.status = 1;
        transaction.gatewayReference =
            referencenumber || transactionid || `VIETQR_${Date.now()}`;
        transaction.paidAt = new Date();
        await transaction.save();

        const invoice = await Invoice.findById(transaction.invoiceId);

        if (invoice) {
            invoice.status = 2;
            invoice.paymentMethod = "VietQR";
            invoice.transactionCode = transaction.orderCode;
            await invoice.save();
            await notifyLandlord({
                event: "invoice_paid",
                contractId: invoice.contractId,
                entityId: invoice._id,
            });
        }

        return res.status(200).json(
            successResponse(transaction._id.toString())
        );
    } catch (error) {
        console.error("VietQR transaction-sync error:", error);
        return res.status(400).json(
            errorResponse(
                "TRANSACTION_FAILED",
                error.message || "Transaction sync failed"
            )
        );
    }
};
