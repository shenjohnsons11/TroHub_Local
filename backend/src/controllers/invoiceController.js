const Invoice = require('../models/Invoice');
const Contract = require('../models/Contract');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const Account = require('../models/Account');
const BillingPolicy = require('../models/BillingPolicy');
const Room = require('../models/Room');

const {
    CalculationError,
    calculateInvoiceAmounts,
    calculateMeterCharge,
    parseNonNegativeFinite,
    roundVnd,
} = require('../services/invoiceCalculator');

const {
    OverdueInvoiceValidationError,
    applyAllOverduePenalties,
    applyOverduePenalty,
    buildLateFeeSnapshot,
} = require('../services/overdueInvoice');

const { sendNotification } = require('../services/notificationService');
const { notifyLandlord } = require('../services/landlordNotificationService');
const { presentInvoice } = require('../services/invoicePresentationService');

const {
    resolveUtilityPriceDefaults,
    resolveContractMeterSnapshot,
} = require('../services/contractTerms');


/* =========================================================
 * HELPER
 * ========================================================= */

function formatVndCurrency(amount) {
    if (!amount) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}


/**
 * Chuẩn hóa tên dịch vụ để nhận diện
 * gửi xe / internet / rác / dịch vụ khác.
 */
function normalizeServiceName(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
}


/**
 * Phân loại dịch vụ vào các field legacy
 * để invoiceCalculator hiện tại vẫn hoạt động.
 */
function classifyInvoiceService(name = '') {
    const normalized = normalizeServiceName(name);

    if (
        normalized.includes('gui xe') ||
        normalized.includes('giu xe') ||
        normalized.includes('parking') ||
        normalized === 'xe'
    ) {
        return 'parking';
    }

    if (
        normalized.includes('internet') ||
        normalized.includes('wifi') ||
        normalized.includes('mang')
    ) {
        return 'internet';
    }

    if (
        normalized.includes('rac') ||
        normalized.includes('ve sinh')
    ) {
        return 'garbage';
    }

    return 'services';
}


/**
 * Chuẩn hóa số tiền.
 */
function safeMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        return 0;
    }

    return roundVnd(number);
}


/**
 * Tạo snapshot toàn bộ dịch vụ đi kèm.
 *
 * Ưu tiên:
 * 1. serviceItems frontend gửi lên
 * 2. contract.services nếu frontend không gửi
 *
 * Kết quả:
 * - details: từng dịch vụ riêng
 * - services
 * - parking
 * - internet
 * - garbage
 */
async function buildExtraServiceSnapshot(reqBody, resolvedContract = null) {
    let sourceItems = Array.isArray(reqBody.serviceItems)
        ? reqBody.serviceItems
        : [];

    /*
     * Nếu frontend không truyền serviceItems,
     * lấy trực tiếp dịch vụ của hợp đồng.
     */
    if (
        sourceItems.length === 0 &&
        Array.isArray(resolvedContract?.services)
    ) {
        sourceItems = resolvedContract.services.map((item) => {
            const populatedService =
                item.serviceId &&
                    typeof item.serviceId === 'object'
                    ? item.serviceId
                    : null;

            return {
                serviceId:
                    populatedService?._id ||
                    populatedService?.id ||
                    item.serviceId,

                name:
                    populatedService?.name ||
                    item.serviceName ||
                    '',

                code:
                    populatedService?.code ||
                    item.serviceCode ||
                    '',

                unit:
                    populatedService?.unit ||
                    item.unit ||
                    '',

                type:
                    populatedService?.type,

                billingMode:
                    populatedService?.billingMode,

                fixedPrice:
                    item.fixedPrice ??
                    populatedService?.defaultPrice ??
                    0,

                amount:
                    item.fixedPrice ??
                    populatedService?.defaultPrice ??
                    0,

                quantity:
                    item.quantity ?? 1,
            };
        });
    }


    /*
     * Lấy ID Service để populate chính xác
     * tên / code / đơn vị.
     */
    const serviceIds = sourceItems
        .map((item) => {
            if (!item?.serviceId) {
                return null;
            }

            if (typeof item.serviceId === 'object') {
                return (
                    item.serviceId._id ||
                    item.serviceId.id ||
                    null
                );
            }

            return item.serviceId;
        })
        .filter(Boolean);


    const serviceDocuments = serviceIds.length
        ? await Service.find({
            _id: {
                $in: serviceIds
            }
        })
            .select(
                'name code unit type billingMode defaultPrice'
            )
            .lean()
        : [];


    const serviceMap = new Map(
        serviceDocuments.map((service) => [
            String(service._id),
            service,
        ])
    );


    const details = [];

    let services = 0;
    let parking = 0;
    let internet = 0;
    let garbage = 0;


    for (const item of sourceItems) {
        let serviceId = null;

        if (item?.serviceId) {
            serviceId =
                typeof item.serviceId === 'object'
                    ? (
                        item.serviceId._id ||
                        item.serviceId.id ||
                        null
                    )
                    : item.serviceId;
        }


        const service =
            serviceId
                ? serviceMap.get(String(serviceId))
                : null;


        const name =
            service?.name ||
            item.name ||
            item.serviceName ||
            'Dịch vụ';


        const code =
            service?.code ||
            item.code ||
            item.serviceCode ||
            '';


        const unit =
            service?.unit ||
            item.unit ||
            'month';


        const serviceType =
            service?.type ??
            item.type;


        const billingMode =
            service?.billingMode ||
            item.billingMode ||
            (
                serviceType === 1
                    ? 'METER'
                    : 'FIXED'
            );


        /*
         * Điện / nước tính riêng bằng chỉ số.
         * Không cộng vào dịch vụ đi kèm.
         */
        if (
            serviceType === 1 ||
            billingMode === 'METER'
        ) {
            continue;
        }


        const quantity =
            Number(item.quantity) > 0
                ? Number(item.quantity)
                : 1;


        const appliedPrice = safeMoney(
            item.fixedPrice ??
            item.appliedPrice ??
            service?.defaultPrice ??
            0
        );


        const amount =
            item.amount !== undefined &&
                item.amount !== null
                ? safeMoney(item.amount)
                : safeMoney(
                    appliedPrice * quantity
                );


        const category =
            classifyInvoiceService(name);


        if (category === 'parking') {
            parking += amount;
        } else if (category === 'internet') {
            internet += amount;
        } else if (category === 'garbage') {
            garbage += amount;
        } else {
            services += amount;
        }


        /*
         * Lưu từng dịch vụ riêng vào Invoice.details.
         */
        details.push({
            serviceId:
                serviceId || undefined,

            serviceName:
                name,

            serviceCode:
                code,

            billingMode:
                billingMode === 'QUANTITY'
                    ? 'QUANTITY'
                    : 'FIXED',

            unit,

            oldIndex:
                null,

            newIndex:
                null,

            quantity,

            appliedPrice,

            amount,
        });
    }


    /*
     * Fallback cho client cũ chỉ truyền servicesAmount.
     */
    if (
        details.length === 0 &&
        safeMoney(reqBody.servicesAmount) > 0
    ) {
        const amount =
            safeMoney(reqBody.servicesAmount);

        services += amount;

        details.push({
            serviceName:
                'Dịch vụ đi kèm',

            serviceCode:
                'OTHER_SERVICES',

            billingMode:
                'FIXED',

            unit:
                'month',

            oldIndex:
                null,

            newIndex:
                null,

            quantity:
                1,

            appliedPrice:
                amount,

            amount,
        });
    }


    return {
        details,

        services:
            safeMoney(services),

        parking:
            safeMoney(parking),

        internet:
            safeMoney(internet),

        garbage:
            safeMoney(garbage),
    };
}


/**
 * Tạo detail Điện / Nước để WebAdmin có thể
 * hiển thị toàn bộ trong InvoiceDetailDrawer.
 */
function buildMeterInvoiceDetail({
    name,
    code,
    unit,
    oldIndex,
    newIndex,
    appliedPrice,
    amount,
}) {
    const oldValue =
        Number(oldIndex) || 0;

    const newValue =
        Number(newIndex) || 0;

    const usage =
        Math.max(
            0,
            newValue - oldValue
        );

    return {
        serviceName:
            name,

        serviceCode:
            code,

        billingMode:
            'METER',

        unit,

        oldIndex:
            oldValue,

        newIndex:
            newValue,

        quantity:
            usage,

        appliedPrice:
            safeMoney(appliedPrice),

        amount:
            safeMoney(amount),
    };
}


/**
 * Bảo đảm details luôn được trả ra,
 * kể cả invoicePresentationService chưa map details.
 */
function presentInvoiceWithDetails(invoice) {
    const presented =
        presentInvoice(invoice);

    const raw =
        typeof invoice?.toObject === 'function'
            ? invoice.toObject()
            : invoice;

    return {
        ...presented,

        details:
            raw?.details || [],
    };
}


/* =========================================================
 * ROOM METER
 * ========================================================= */

async function syncRoomMeterReadings({
    roomId,
    electricityNew,
    waterNew,
    reason = 'invoice',
}) {
    if (!roomId) return;

    const update = {
        $unset: {
            draftElectricity: '',
            draftWater: ''
        },
    };


    if (
        Number.isFinite(
            Number(electricityNew)
        )
    ) {
        update.$set =
            update.$set || {};

        update.$set.lastElectricityReading =
            Number(electricityNew);
    }


    if (
        Number.isFinite(
            Number(waterNew)
        )
    ) {
        update.$set =
            update.$set || {};

        update.$set.lastWaterReading =
            Number(waterNew);
    }


    if (!update.$set) {
        return;
    }


    await Room.findByIdAndUpdate(
        roomId,
        update
    );
}


/* =========================================================
 * NOTIFICATION
 * ========================================================= */

async function triggerInvoiceNotification(
    invoice,
    contractSnapshot = null
) {
    try {
        if (!invoice) return;

        let tenantId = null;

        let roomCode =
            invoice.room || '';


        if (invoice.contractId) {
            const contract =
                contractSnapshot ||
                await Contract.findById(
                    invoice.contractId
                );


            if (contract) {
                tenantId =
                    contract.tenantId;


                if (
                    !roomCode &&
                    contract.roomId
                ) {
                    const roomObj =
                        await Room.findById(
                            contract.roomId
                        );

                    if (roomObj) {
                        roomCode =
                            roomObj.roomCode;
                    }
                }
            }
        }


        if (
            !tenantId &&
            invoice.tenant
        ) {
            const tenantAcc =
                await Account.findOne({
                    fullName:
                        invoice.tenant,

                    role:
                        2
                });


            if (tenantAcc) {
                tenantId =
                    tenantAcc._id;
            }
        }


        if (tenantId) {
            const totalStr =
                formatVndCurrency(
                    invoice.totalAmount
                );


            const periodStr =
                invoice.period || '';


            await sendNotification({
                userId:
                    tenantId,

                title:
                    `Hóa đơn mới kỳ ${periodStr}`,

                content:
                    `Hóa đơn phòng ${roomCode} kỳ ${periodStr} với tổng tiền ${totalStr} đã phát hành. Vui lòng thanh toán đúng hạn.`,

                category:
                    "invoice",

                deepLink:
                    'invoice',

                metadata: {
                    invoiceId:
                        invoice._id,

                    period:
                        periodStr,

                    totalAmount:
                        invoice.totalAmount,

                    action:
                        'view'
                },

                eventKey:
                    `invoice:${invoice._id}:issued`,
            });
        }
    } catch (err) {
        console.error(
            '[triggerInvoiceNotification Error]',
            err.message
        );
    }
}


async function triggerInvoiceReminder(invoice) {
    const contract =
        invoice.contractId &&
        await Contract.findById(
            invoice.contractId
        );


    if (!contract?.tenantId) {
        return;
    }


    await sendNotification({
        userId:
            contract.tenantId,

        title:
            `Nhắc thanh toán hóa đơn kỳ ${invoice.period || ''}`,

        content:
            'Chủ trọ vừa gửi nhắc nhở thanh toán. Vui lòng kiểm tra hóa đơn và thanh toán đúng hạn.',

        category:
            'invoice',

        deepLink:
            'invoice',

        metadata: {
            invoiceId:
                invoice._id,

            period:
                invoice.period,

            action:
                'payment'
        },

        eventKey:
            `invoice:${invoice._id}:reminder:${invoice.remindCount}`,
    });
}


/* =========================================================
 * POLICY
 * ========================================================= */

async function buildInvoicePolicySnapshot(
    req,
    issuedAt,
    penaltyBaseAmount
) {
    const policy =
        await BillingPolicy.findOne({
            landlordId:
                req.auth?.id
        });


    return buildLateFeeSnapshot({
        issuedAt:
            issuedAt || new Date(),

        graceDays:
            policy?.lateFeeGraceDays ?? 3,

        penaltyRate:
            policy?.lateFeeRate ?? 5,

        penaltyBaseAmount,
    });
}


function sendInvoiceError(
    res,
    error,
    fallbackMessage
) {
    if (
        error instanceof CalculationError ||
        error instanceof OverdueInvoiceValidationError
    ) {
        return res
            .status(400)
            .json({
                success:
                    false,

                code:
                    error.code,

                field:
                    error.field,

                message:
                    error.message,
            });
    }


    return res
        .status(500)
        .json({
            success:
                false,

            code:
                'INVOICE_OPERATION_FAILED',

            message:
                `${fallbackMessage}: ${error.message}`,
        });
}


/* =========================================================
 * BULK PREVIEW
 * ========================================================= */

exports.getBulkPreview = async (
    req,
    res
) => {
    try {
        const authHeader =
            req.headers['authorization'];


        let userId =
            null;


        if (
            authHeader &&
            authHeader.startsWith('Bearer ')
        ) {
            const token =
                authHeader.split(' ')[1];


            try {
                const decoded =
                    jwt.verify(
                        token,
                        JWT_SECRET
                    );

                userId =
                    decoded.id;
            } catch (e) { }
        }


        if (!userId) {
            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        'Chưa đăng nhập'
                });
        }


        const [
            rooms,
            utilityServices
        ] = await Promise.all([
            Room.find({
                landlordId:
                    userId
            }),

            Service.find({
                landlordId:
                    userId,

                isActive:
                    true,

                type:
                    1
            })
                .sort({
                    updatedAt:
                        -1,

                    _id:
                        -1
                })
                .select(
                    'name code type defaultPrice'
                )
                .lean(),
        ]);


        const roomIds =
            rooms.map(
                r => r._id
            );


        const utilityDefaults =
            resolveUtilityPriceDefaults(
                utilityServices
            );


        const contracts =
            await Contract.find({
                roomId: {
                    $in:
                        roomIds
                },

                status:
                    1
            })
                .populate(
                    'roomId',
                    'roomCode draftElectricity draftWater lastElectricityReading lastWaterReading'
                )
                .populate(
                    'tenantId',
                    'fullName phone'
                )
                .populate(
                    'services.serviceId',
                    'name type'
                );


        const previewList =
            [];


        for (
            const contract
            of contracts
        ) {
            const previousInvoice =
                await Invoice.findOne({
                    contractId:
                        contract._id,

                    status: {
                        $in:
                            [1, 2, 3]
                    }
                })
                    .sort({
                        createdAt:
                            -1
                    });


            const roomAmount =
                contract.fixedRentPrice ||
                0;


            const {
                electricityOld,
                waterOld,
                electricityPrice,
                waterPrice,
            } =
                resolveContractMeterSnapshot(
                    contract,
                    previousInvoice,
                    contract.roomId,
                    utilityDefaults
                );


            let servicesTotal =
                0;

            let parking =
                0;

            let internet =
                0;

            let garbage =
                0;


            for (
                const item
                of contract.services
            ) {
                const service =
                    item.serviceId;


                if (!service) {
                    continue;
                }


                const sName =
                    service.name
                        .toLowerCase();


                if (
                    service.type !==
                    1
                ) {
                    if (
                        sName.includes('xe') ||
                        sName.includes('parking')
                    ) {
                        parking +=
                            item.fixedPrice ||
                            0;
                    } else if (
                        sName.includes('wifi') ||
                        sName.includes('internet') ||
                        sName.includes('mạng') ||
                        sName.includes('mang')
                    ) {
                        internet +=
                            item.fixedPrice ||
                            0;
                    } else if (
                        sName.includes('rác') ||
                        sName.includes('rac') ||
                        sName.includes('vệ sinh')
                    ) {
                        garbage +=
                            item.fixedPrice ||
                            0;
                    } else {
                        servicesTotal +=
                            item.fixedPrice ||
                            0;
                    }
                }
            }


            console.log(
                `Contract ${contract._id} preview:`,
                {
                    eOld:
                        electricityOld,

                    ePrice:
                        electricityPrice,

                    wOld:
                        waterOld,

                    wPrice:
                        waterPrice,

                    servicesTotal,

                    parking,

                    internet,

                    garbage
                }
            );


            const rawDraftElec =
                contract.roomId
                    ?.draftElectricity;


            const rawDraftWater =
                contract.roomId
                    ?.draftWater;


            const electricityDraft =
                (
                    rawDraftElec !== undefined &&
                    rawDraftElec !== null &&
                    Number(rawDraftElec) >
                    Number(electricityOld)
                )
                    ? rawDraftElec
                    : "";


            const waterDraft =
                (
                    rawDraftWater !== undefined &&
                    rawDraftWater !== null &&
                    Number(rawDraftWater) >
                    Number(waterOld)
                )
                    ? rawDraftWater
                    : "";


            previewList.push({
                contractId:
                    contract._id,

                roomId:
                    contract.roomId._id,

                room:
                    contract.roomId.roomCode,

                tenant:
                    contract.tenantId.fullName,

                roomAmount,

                electricityOld,

                electricityPrice,

                electricityDraft,

                waterOld,

                waterPrice,

                waterDraft,

                services:
                    servicesTotal,

                parking,

                internet,

                garbage
            });
        }


        res
            .status(200)
            .json({
                success:
                    true,

                data:
                    previewList
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    error.message
            });
    }
};


/* =========================================================
 * CREATE BULK
 * ========================================================= */

exports.createBulkInvoices = async (
    req,
    res
) => {
    try {
        const {
            invoices,
            period,
            issuedAt
        } = req.body;


        if (
            !invoices ||
            !Array.isArray(invoices)
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "Dữ liệu hóa đơn không hợp lệ"
                });
        }


        const preparedInvoices =
            invoices.map(
                (data) => ({
                    data,

                    amounts:
                        calculateInvoiceAmounts({
                            ...data,

                            penalty:
                                0
                        }),
                })
            );


        const contractIds =
            [...new Set(
                preparedInvoices
                    .map(
                        ({ data }) =>
                            data.contractId
                    )
                    .filter(Boolean)
                    .map(String)
            )];


        const [
            policy,
            unpaidInvoices,
            contracts
        ] =
            await Promise.all([
                BillingPolicy.findOne({
                    landlordId:
                        req.auth.id
                }),

                contractIds.length
                    ? Invoice.find({
                        contractId: {
                            $in:
                                contractIds
                        },

                        status: {
                            $in:
                                [1, 3]
                        }
                    })
                        .select(
                            'contractId totalAmount'
                        )
                        .lean()

                    : [],


                contractIds.length
                    ? Contract.find({
                        _id: {
                            $in:
                                contractIds
                        }
                    })
                        .select(
                            '_id roomId'
                        )
                        .lean()

                    : [],
            ]);


        const debtByContract =
            new Map();


        for (
            const invoice
            of unpaidInvoices
        ) {
            const contractId =
                String(
                    invoice.contractId
                );


            debtByContract.set(
                contractId,

                (
                    debtByContract.get(
                        contractId
                    ) ||
                    0
                ) +
                (
                    invoice.totalAmount ||
                    0
                )
            );
        }


        let resolvedPeriod =
            period;


        if (!resolvedPeriod) {
            const d =
                new Date();


            resolvedPeriod =
                `${String(
                    d.getMonth() + 1
                ).padStart(
                    2,
                    '0'
                )}/${d.getFullYear()}`;
        }


        const invoiceDocuments =
            preparedInvoices.map(
                ({
                    data,
                    amounts
                }) => {
                    const policySnapshot =
                        buildLateFeeSnapshot({
                            issuedAt:
                                data.issuedAt ||
                                issuedAt ||
                                new Date(),

                            graceDays:
                                policy?.lateFeeGraceDays ??
                                3,

                            penaltyRate:
                                policy?.lateFeeRate ??
                                5,

                            penaltyBaseAmount:
                                amounts.totalAmount,
                        });


                    const penaltyAppliedAt =
                        policySnapshot.isOverdue
                            ? new Date()
                            : null;


                    const penalty =
                        policySnapshot.isOverdue
                            ? policySnapshot.penalty
                            : 0;


                    let warningNote =
                        "";


                    if (data.contractId) {
                        const totalDebt =
                            debtByContract.get(
                                String(
                                    data.contractId
                                )
                            ) ||
                            0;


                        if (totalDebt > 0) {
                            warningNote =
                                `LƯU Ý: Phòng đang có khoản nợ ${totalDebt.toLocaleString("vi-VN")}đ từ kỳ trước chưa thanh toán.`;
                        }
                    }


                    return {
                        contractId:
                            data.contractId ||
                            null,

                        period:
                            resolvedPeriod,

                        issuedAt:
                            policySnapshot.issuedAt,

                        graceDaysSnapshot:
                            policySnapshot.graceDaysSnapshot,

                        penaltyRateSnapshot:
                            policySnapshot.penaltyRateSnapshot,

                        overdueAt:
                            policySnapshot.overdueAt,

                        dueDate:
                            new Date(
                                policySnapshot.overdueAt.getTime() -
                                24 * 60 * 60 * 1000
                            ),

                        penaltyBaseAmount:
                            policySnapshot.penaltyBaseAmount,

                        penaltyAppliedAt,

                        penalty,

                        totalAmount:
                            policySnapshot.penaltyBaseAmount +
                            penalty,

                        status:
                            policySnapshot.isOverdue
                                ? 3
                                : 1,

                        room:
                            data.room ||
                            "",

                        tenant:
                            data.tenant ||
                            "",

                        roomAmount:
                            amounts.roomAmount,

                        electricityOld:
                            amounts.electricityOld,

                        electricityNew:
                            amounts.electricityNew,

                        electricity:
                            amounts.electricity,

                        waterOld:
                            amounts.waterOld,

                        waterNew:
                            amounts.waterNew,

                        water:
                            amounts.water,

                        services:
                            amounts.services,

                        parking:
                            amounts.parking,

                        internet:
                            amounts.internet,

                        garbage:
                            amounts.garbage,

                        discount:
                            amounts.discount,

                        note:
                            warningNote,

                        details:
                            []
                    };
                }
            );


        const createdInvoices =
            await Invoice.insertMany(
                invoiceDocuments
            );


        const roomOps =
            [];


        const invoiceByContractId =
            new Map(
                createdInvoices.map(
                    (invoice) => [
                        String(
                            invoice.contractId
                        ),

                        invoice
                    ]
                )
            );


        for (
            const contract
            of contracts
        ) {
            const invoice =
                invoiceByContractId.get(
                    String(
                        contract._id
                    )
                );


            const roomId =
                contract.roomId?._id ||
                contract.roomId;


            if (!invoice) {
                continue;
            }


            roomOps.push({
                updateOne: {
                    filter: {
                        _id:
                            roomId
                    },

                    update: {
                        $set: {
                            lastElectricityReading:
                                Number(
                                    invoice.electricityNew
                                ) ||
                                0,

                            lastWaterReading:
                                Number(
                                    invoice.waterNew
                                ) ||
                                0,
                        },

                        $unset: {
                            draftElectricity:
                                "",

                            draftWater:
                                ""
                        },
                    },
                },
            });
        }


        if (roomOps.length) {
            await Room.bulkWrite(
                roomOps
            );
        }


        await Promise.all(
            createdInvoices.map(
                async (inv) => {
                    const contract =
                        contracts.find(
                            (item) =>
                                String(
                                    item._id
                                ) ===
                                String(
                                    inv.contractId
                                )
                        );


                    const tenantId =
                        contract?.tenantId?._id ||
                        contract?.tenantId;


                    if (!tenantId) {
                        return;
                    }


                    await triggerInvoiceNotification(
                        inv,
                        contract
                    );


                    await sendNotification({
                        userId:
                            tenantId,

                        title:
                            `Đã chốt chỉ số điện nước kỳ ${inv.period || ''}`,

                        content:
                            `Điện ${inv.electricityOld} → ${inv.electricityNew} kWh, nước ${inv.waterOld} → ${inv.waterNew} m³.`,

                        category:
                            'utility',

                        deepLink:
                            'utility',

                        metadata: {
                            roomId:
                                contract?.roomId?._id ||
                                contract?.roomId,

                            period:
                                inv.period,

                            electricityOld:
                                inv.electricityOld,

                            electricityNew:
                                inv.electricityNew,

                            waterOld:
                                inv.waterOld,

                            waterNew:
                                inv.waterNew
                        },

                        eventKey:
                            `utility:${inv._id}:confirmed`,
                    });
                }
            )
        );


        res
            .status(201)
            .json({
                success:
                    true,

                message:
                    `Đã tạo thành công ${createdInvoices.length} hóa đơn!`,

                data:
                    createdInvoices
            });
    } catch (error) {
        return sendInvoiceError(
            res,
            error,
            'Lỗi tạo hóa đơn hàng loạt'
        );
    }
};


/* =========================================================
 * REMINDER
 * ========================================================= */

exports.remindInvoicePayment = async (
    req,
    res
) => {
    try {
        const {
            id
        } =
            req.params;


        const invoice =
            await Invoice.findById(
                id
            );


        if (!invoice) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    message:
                        'Không tìm thấy hóa đơn'
                });
        }


        const landlordId =
            req.auth?.id;


        if (!landlordId) {
            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        'Chưa xác thực thông tin đăng nhập'
                });
        }


        let contract =
            null;


        if (invoice.contractId) {
            contract =
                await Contract.findById(
                    invoice.contractId
                )
                    .populate({
                        path:
                            'roomId',

                        select:
                            'roomCode landlordId'
                    })
                    .populate({
                        path:
                            'tenantId',

                        select:
                            '_id fullName phone email'
                    });
        }


        if (
            contract &&
            contract.roomId &&
            contract.roomId.landlordId
        ) {
            const roomLandlordId =
                contract.roomId.landlordId._id ||
                contract.roomId.landlordId;


            if (
                roomLandlordId.toString() !==
                landlordId.toString() &&
                req.auth.role !== 1
            ) {
                return res
                    .status(403)
                    .json({
                        success:
                            false,

                        message:
                            'Bạn không có quyền thao tác trên hóa đơn này'
                    });
            }
        }


        let tenantId =
            null;


        let tenantAccount =
            null;


        if (contract?.tenantId) {
            tenantId =
                contract.tenantId._id ||
                contract.tenantId;


            tenantAccount =
                typeof contract.tenantId ===
                    'object' &&
                    contract.tenantId.fullName

                    ? contract.tenantId

                    : await Account.findById(
                        tenantId
                    );
        }


        if (
            !tenantId &&
            invoice.tenant
        ) {
            tenantAccount =
                await Account.findOne({
                    fullName:
                        invoice.tenant,

                    role:
                        2
                });


            if (tenantAccount) {
                tenantId =
                    tenantAccount._id;
            }
        }


        if (!tenantId) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        'Không tìm thấy thông tin Khách thuê cho hóa đơn này'
                });
        }


        const roomName =
            contract?.roomId?.roomCode ||
            invoice.room ||
            'N/A';


        const formattedAmount =
            (
                invoice.totalAmount ||
                0
            ).toLocaleString(
                'vi-VN'
            );


        let periodStr =
            invoice.period ||
            '';


        let month =
            '';


        let year =
            '';


        if (
            periodStr.includes('/')
        ) {
            const parts =
                periodStr.split('/');


            month =
                parts[0]
                    .replace(
                        /\D/g,
                        ''
                    ) ||
                parts[0];


            year =
                parts[1]
                    .replace(
                        /\D/g,
                        ''
                    ) ||
                parts[1];
        } else {
            const now =
                new Date();


            month =
                String(
                    now.getMonth() +
                    1
                );


            year =
                String(
                    now.getFullYear()
                );
        }


        const title =
            "🔔 Nhắc nợ Hóa đơn";


        const message =
            `Hóa đơn tháng ${month}/${year} phòng ${roomName} số tiền ${formattedAmount}đ đã đến hạn thanh toán. Vui lòng kiểm tra và thanh toán.`;


        const deepLink =
            `/tenant/invoices/${invoice._id}`;


        invoice.remindCount =
            (
                invoice.remindCount ||
                0
            ) +
            1;


        if (
            invoice.remindCount >=
            2 &&
            invoice.status ===
            1
        ) {
            invoice.status =
                3;
        }


        await invoice.save();


        await sendNotification({
            userId:
                tenantId,

            title,

            content:
                message,

            category:
                "invoice",

            deepLink,

            metadata: {
                invoiceId:
                    invoice._id,

                period:
                    invoice.period,

                totalAmount:
                    invoice.totalAmount,

                action:
                    'remind',
            },

            eventKey:
                `invoice:${invoice._id}:remind:${invoice.remindCount}:${Date.now()}`,
        });


        return res
            .status(200)
            .json({
                success:
                    true,

                message:
                    "Đã gửi thông báo nhắc nợ thành công!",

                data:
                    invoice
            });
    } catch (error) {
        console.error(
            '[remindInvoicePayment Error]',
            error
        );


        return res
            .status(500)
            .json({
                success:
                    false,

                message:
                    'Lỗi Server: ' +
                    error.message
            });
    }
};


exports.remindInvoice =
    exports.remindInvoicePayment;


/* =========================================================
 * GET ALL INVOICES
 * ========================================================= */

exports.getAllInvoices = async (
    req,
    res
) => {
    try {
        await applyAllOverduePenalties();


        const userId =
            req.auth.id;


        const userRole =
            req.auth.role;


        let query =
            {};


        if (
            userRole === 2 &&
            userId
        ) {
            const tenantContracts =
                await Contract.find({
                    tenantId:
                        userId
                })
                    .sort({
                        createdAt:
                            -1
                    });


            const currentContractIds =
                tenantContracts.map(
                    c => c._id
                );


            query = {
                contractId: {
                    $in:
                        currentContractIds
                },

                status: {
                    $ne:
                        0
                }
            };
        } else if (
            userRole === 1 &&
            userId
        ) {
            const rooms =
                await Room.find({
                    landlordId:
                        userId
                })
                    .select(
                        '_id roomCode'
                    );


            const roomIds =
                rooms.map(
                    r => r._id
                );


            const roomCodes =
                rooms.map(
                    r => r.roomCode
                );


            const contracts =
                await Contract.find({
                    roomId: {
                        $in:
                            roomIds
                    }
                })
                    .select(
                        '_id'
                    );


            const contractIds =
                contracts.map(
                    c => c._id
                );


            query = {
                $or: [
                    {
                        contractId: {
                            $in:
                                contractIds
                        }
                    },

                    {
                        room: {
                            $in:
                                roomCodes
                        }
                    }
                ]
            };
        }


        const invoices =
            await Invoice.find(
                query
            )
                .populate({
                    path:
                        'contractId',

                    populate: [
                        {
                            path:
                                'roomId',

                            select:
                                'roomCode landlordId defaultRentPrice',

                            populate: {
                                path:
                                    'landlordId',

                                select:
                                    'bankId bankAccountNo bankAccountName fullName'
                            }
                        },

                        {
                            path:
                                'tenantId',

                            select:
                                'fullName phone'
                        }
                    ]
                })
                .populate(
                    'details.serviceId',
                    'name code unit type billingMode'
                )
                .sort({
                    createdAt:
                        -1
                });


        /*
         * QUAN TRỌNG:
         * Ép trả details ra ngoài API.
         */
        const data =
            invoices.map(
                presentInvoiceWithDetails
            );


        res
            .status(200)
            .json({
                success:
                    true,

                data
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    "Lỗi Server: " +
                    error.message
            });
    }
};


/* =========================================================
 * CREATE SINGLE INVOICE
 * ========================================================= */

exports.createInvoice = async (
    req,
    res
) => {
    try {
        const {
            contractId,
            period,
            dueDate,
            serviceIndices,
            room,
            tenant
        } =
            req.body;


        /*
         * Lấy landlordId từ token.
         */
        let landlordId =
            null;


        const authHeader =
            req.headers['authorization'];


        if (
            authHeader &&
            authHeader.startsWith(
                'Bearer '
            )
        ) {
            const token =
                authHeader.split(' ')[1];


            try {
                const decoded =
                    jwt.verify(
                        token,
                        JWT_SECRET
                    );


                if (
                    decoded.role ===
                    1
                ) {
                    landlordId =
                        decoded.id;
                }
            } catch (e) { }
        }


        /*
         * =====================================================
         * FLOW FRONTEND WEBADMIN
         * =====================================================
         */
        if (
            room ||
            tenant ||
            req.body.roomId
        ) {
            let resolvedContractId =
                contractId;


            let resolvedRoomId =
                req.body.roomId ||
                null;


            let resolvedRoom =
                room ||
                "";


            let resolvedTenant =
                tenant ||
                "";


            let resolvedContract =
                null;


            /*
             * Nếu frontend có gửi contractId,
             * thử load contract trước.
             */
            if (resolvedContractId) {
                resolvedContract =
                    await Contract.findById(
                        resolvedContractId
                    )
                        .populate(
                            'tenantId',
                            'fullName'
                        )
                        .populate(
                            'services.serviceId',
                            'name code unit type billingMode defaultPrice'
                        );


                if (resolvedContract) {
                    if (
                        !resolvedRoomId &&
                        resolvedContract.roomId
                    ) {
                        resolvedRoomId =
                            resolvedContract.roomId._id ||
                            resolvedContract.roomId;
                    }


                    if (
                        !resolvedTenant &&
                        resolvedContract.tenantId
                    ) {
                        resolvedTenant =
                            resolvedContract.tenantId.fullName ||
                            "";
                    }
                }
            }


            /*
             * Tìm theo roomId.
             */
            if (req.body.roomId) {
                const targetRoom =
                    await Room.findById(
                        req.body.roomId
                    );


                if (targetRoom) {
                    resolvedRoomId =
                        targetRoom._id;


                    resolvedRoom =
                        targetRoom.roomCode;


                    /*
                     * Nếu chưa load contract bằng contractId
                     * hoặc contract không đúng phòng,
                     * tìm contract mới nhất của phòng.
                     */
                    if (
                        !resolvedContract ||
                        String(
                            resolvedContract.roomId?._id ||
                            resolvedContract.roomId
                        ) !==
                        String(
                            targetRoom._id
                        )
                    ) {
                        const foundContract =
                            await Contract.findOne({
                                roomId:
                                    targetRoom._id,

                                status: {
                                    $in:
                                        [0, 1, 4, 5]
                                }
                            })
                                .populate(
                                    'tenantId',
                                    'fullName'
                                )
                                .populate(
                                    'services.serviceId',
                                    'name code unit type billingMode defaultPrice'
                                )
                                .sort({
                                    createdAt:
                                        -1
                                });


                        if (foundContract) {
                            resolvedContract =
                                foundContract;


                            resolvedContractId =
                                foundContract._id;
                        }
                    }


                    if (
                        resolvedContract &&
                        !resolvedTenant &&
                        resolvedContract.tenantId
                    ) {
                        resolvedTenant =
                            resolvedContract.tenantId.fullName ||
                            "";
                    }
                }
            }


            /*
             * Fallback tìm theo mã phòng.
             */
            else if (
                !resolvedContractId &&
                room
            ) {
                const roomQuery = {
                    roomCode:
                        room
                };


                if (landlordId) {
                    roomQuery.landlordId =
                        landlordId;
                }


                const targetRoom =
                    await Room.findOne(
                        roomQuery
                    );


                if (targetRoom) {
                    resolvedRoomId =
                        targetRoom._id;


                    const foundContract =
                        await Contract.findOne({
                            roomId:
                                targetRoom._id,

                            status: {
                                $in:
                                    [0, 1, 4, 5]
                            }
                        })
                            .populate(
                                'tenantId',
                                'fullName'
                            )
                            .populate(
                                'services.serviceId',
                                'name code unit type billingMode defaultPrice'
                            )
                            .sort({
                                createdAt:
                                    -1
                            });


                    if (foundContract) {
                        resolvedContract =
                            foundContract;


                        resolvedContractId =
                            foundContract._id;


                        resolvedRoomId =
                            foundContract.roomId?._id ||
                            foundContract.roomId;


                        if (
                            !resolvedTenant &&
                            foundContract.tenantId
                        ) {
                            resolvedTenant =
                                foundContract.tenantId.fullName ||
                                "";
                        }
                    }
                }
            }


            /*
             * Period.
             */
            let resolvedPeriod =
                period;


            if (
                !resolvedPeriod &&
                req.body.fromDate
            ) {
                const parts =
                    req.body.fromDate
                        .split('/');


                if (
                    parts.length ===
                    3
                ) {
                    resolvedPeriod =
                        `${parts[1]}/${parts[2]}`;
                }
            }


            if (!resolvedPeriod) {
                const d =
                    new Date();


                resolvedPeriod =
                    `${String(
                        d.getMonth() + 1
                    ).padStart(
                        2,
                        '0'
                    )}/${d.getFullYear()}`;
            }


            /*
             * Trạng thái.
             */
            let resolvedStatus =
                1;


            if (
                req.body.status ===
                "Nháp" ||
                req.body.status ===
                0 ||
                Number(
                    req.body.status
                ) ===
                0
            ) {
                resolvedStatus =
                    0;
            } else if (
                req.body.status ===
                "Đã thanh toán" ||
                req.body.status ===
                2 ||
                Number(
                    req.body.status
                ) ===
                2
            ) {
                resolvedStatus =
                    2;
            } else if (
                req.body.status ===
                "Quá hạn" ||
                req.body.status ===
                3 ||
                Number(
                    req.body.status
                ) ===
                3
            ) {
                resolvedStatus =
                    3;
            }


            /*
             * Giữ phần parse ngày cũ.
             */
            let parsedDueDate =
                new Date();


            if (dueDate) {
                if (
                    typeof dueDate ===
                    'string'
                ) {
                    if (
                        dueDate.includes('/')
                    ) {
                        const parts =
                            dueDate.split('/');


                        parsedDueDate =
                            new Date(
                                parts[2],
                                parts[1] - 1,
                                parts[0]
                            );
                    } else {
                        parsedDueDate =
                            new Date(
                                dueDate
                            );
                    }
                } else {
                    parsedDueDate =
                        new Date(
                            dueDate
                        );
                }
            }


            const targetRoomObj =
                resolvedRoomId
                    ? await Room.findById(
                        resolvedRoomId
                    )
                    : null;


            /*
             * Điện.
             */
            const electricityOld =
                req.body.electricityOld !==
                    undefined &&
                    req.body.electricityOld !==
                    null &&
                    req.body.electricityOld !==
                    ''

                    ? Number(
                        req.body.electricityOld
                    )

                    : (
                        targetRoomObj
                            ?.lastElectricityReading ||
                        0
                    );


            const electricityNew =
                req.body.electricityNew !==
                    undefined &&
                    req.body.electricityNew !==
                    null &&
                    req.body.electricityNew !==
                    ''

                    ? Number(
                        req.body.electricityNew
                    )

                    : (
                        targetRoomObj
                            ?.draftElectricity !==
                            undefined &&
                            targetRoomObj
                                ?.draftElectricity !==
                            null

                            ? Number(
                                targetRoomObj
                                    .draftElectricity
                            )

                            : electricityOld
                    );


            const electricityPrice =
                req.body.electricityPrice !==
                    undefined &&
                    req.body.electricityPrice !==
                    null &&
                    req.body.electricityPrice !==
                    ''

                    ? Number(
                        req.body.electricityPrice
                    )

                    : (
                        resolvedContract
                            ?.electricityPrice ||
                        3500
                    );


            /*
             * Nước.
             */
            const waterOld =
                req.body.waterOld !==
                    undefined &&
                    req.body.waterOld !==
                    null &&
                    req.body.waterOld !==
                    ''

                    ? Number(
                        req.body.waterOld
                    )

                    : (
                        targetRoomObj
                            ?.lastWaterReading ||
                        0
                    );


            const waterNew =
                req.body.waterNew !==
                    undefined &&
                    req.body.waterNew !==
                    null &&
                    req.body.waterNew !==
                    ''

                    ? Number(
                        req.body.waterNew
                    )

                    : (
                        targetRoomObj
                            ?.draftWater !==
                            undefined &&
                            targetRoomObj
                                ?.draftWater !==
                            null

                            ? Number(
                                targetRoomObj
                                    .draftWater
                            )

                            : waterOld
                    );


            const waterPrice =
                req.body.waterPrice !==
                    undefined &&
                    req.body.waterPrice !==
                    null &&
                    req.body.waterPrice !==
                    ''

                    ? Number(
                        req.body.waterPrice
                    )

                    : (
                        resolvedContract
                            ?.waterPrice ||
                        15000
                    );


            /*
             * Tiền phòng.
             */
            const roomAmount =
                req.body.roomAmount !==
                    undefined &&
                    req.body.roomAmount !==
                    null &&
                    req.body.roomAmount !==
                    ''

                    ? Number(
                        req.body.roomAmount
                    )

                    : (
                        resolvedContract
                            ?.monthlyRent ||

                        resolvedContract
                            ?.fixedRentPrice ||

                        targetRoomObj
                            ?.basePrice ||

                        targetRoomObj
                            ?.defaultRentPrice ||

                        0
                    );


            /*
             * ==================================================
             * DỊCH VỤ ĐI KÈM
             * ==================================================
             *
             * Đây là phần quan trọng để sửa lỗi:
             * bảo vệ + internet + rác + gửi xe bị mất.
             */
            const extraServiceSnapshot =
                await buildExtraServiceSnapshot(
                    req.body,
                    resolvedContract
                );


            /*
             * ==================================================
             * TÍNH TỔNG
             * ==================================================
             */
            const amounts =
                calculateInvoiceAmounts({
                    ...req.body,

                    electricityOld,

                    electricityNew,

                    electricityPrice,

                    waterOld,

                    waterNew,

                    waterPrice,

                    roomAmount,

                    /*
                     * Override bằng số dịch vụ vừa tính.
                     */
                    services:
                        extraServiceSnapshot.services,

                    parking:
                        extraServiceSnapshot.parking,

                    internet:
                        extraServiceSnapshot.internet,

                    garbage:
                        extraServiceSnapshot.garbage,

                    penalty:
                        0
                });


            /*
             * Tạo detail Điện.
             */
            const electricityDetail =
                buildMeterInvoiceDetail({
                    name:
                        'Điện',

                    code:
                        'ELECTRICITY',

                    unit:
                        'kWh',

                    oldIndex:
                        amounts.electricityOld,

                    newIndex:
                        amounts.electricityNew,

                    appliedPrice:
                        electricityPrice,

                    amount:
                        amounts.electricity,
                });


            /*
             * Tạo detail Nước.
             */
            const waterDetail =
                buildMeterInvoiceDetail({
                    name:
                        'Nước',

                    code:
                        'WATER',

                    unit:
                        'm³',

                    oldIndex:
                        amounts.waterOld,

                    newIndex:
                        amounts.waterNew,

                    appliedPrice:
                        waterPrice,

                    amount:
                        amounts.water,
                });


            /*
             * Đây chính là mảng Web + App sẽ đọc.
             */
            const invoiceDetails = [
                electricityDetail,

                waterDetail,

                ...extraServiceSnapshot.details,
            ];


            /*
             * Policy.
             */
            const policySnapshot =
                await buildInvoicePolicySnapshot(
                    req,
                    req.body.issuedAt,
                    amounts.totalAmount
                );


            const shouldApplyPenalty =
                policySnapshot.isOverdue &&
                resolvedStatus !==
                0 &&
                resolvedStatus !==
                2;


            const effectivePenalty =
                shouldApplyPenalty
                    ? policySnapshot.penalty
                    : 0;


            /*
             * Nợ cũ.
             */
            let warningNote =
                req.body.note ||
                "";


            if (resolvedContractId) {
                const unpaidInvoices =
                    await Invoice.find({
                        contractId:
                            resolvedContractId,

                        status: {
                            $in:
                                [1, 3]
                        }
                    });


                const totalDebt =
                    unpaidInvoices.reduce(
                        (
                            sum,
                            inv
                        ) =>
                            sum +
                            (
                                inv.totalAmount ||
                                0
                            ),

                        0
                    );


                if (totalDebt > 0) {
                    warningNote =
                        `LƯU Ý: Phòng đang có khoản nợ ${totalDebt.toLocaleString("vi-VN")}đ từ kỳ trước chưa thanh toán.\n${warningNote}`.trim();
                }
            }


            /*
             * ==================================================
             * CREATE INVOICE
             * ==================================================
             */
            const newInvoice =
                new Invoice({
                    contractId:
                        resolvedContractId ||
                        null,

                    period:
                        resolvedPeriod,

                    issuedAt:
                        policySnapshot.issuedAt,

                    graceDaysSnapshot:
                        policySnapshot.graceDaysSnapshot,

                    penaltyRateSnapshot:
                        policySnapshot.penaltyRateSnapshot,

                    overdueAt:
                        policySnapshot.overdueAt,

                    dueDate:
                        new Date(
                            policySnapshot.overdueAt.getTime() -
                            24 * 60 * 60 * 1000
                        ),

                    penaltyBaseAmount:
                        policySnapshot.penaltyBaseAmount,

                    penaltyAppliedAt:
                        shouldApplyPenalty
                            ? new Date()
                            : null,

                    totalAmount:
                        policySnapshot.penaltyBaseAmount +
                        effectivePenalty,

                    status:
                        shouldApplyPenalty
                            ? 3
                            : resolvedStatus,

                    room:
                        resolvedRoom ||
                        "",

                    tenant:
                        resolvedTenant ||
                        "",

                    fromDate:
                        req.body.fromDate ||
                        "",

                    toDate:
                        req.body.toDate ||
                        "",

                    roomAmount:
                        amounts.roomAmount,

                    electricityOld:
                        amounts.electricityOld,

                    electricityNew:
                        amounts.electricityNew,

                    electricity:
                        amounts.electricity,

                    waterOld:
                        amounts.waterOld,

                    waterNew:
                        amounts.waterNew,

                    water:
                        amounts.water,

                    /*
                     * Tổng dịch vụ legacy.
                     */
                    services:
                        amounts.services,

                    parking:
                        amounts.parking,

                    internet:
                        amounts.internet,

                    garbage:
                        amounts.garbage,

                    discount:
                        amounts.discount,

                    penaltyDays:
                        policySnapshot.graceDaysSnapshot,

                    penaltyRate:
                        policySnapshot.penaltyRateSnapshot,

                    penalty:
                        effectivePenalty,

                    paymentMethod:
                        req.body.paymentMethod ||
                        "",

                    transactionCode:
                        req.body.transactionCode ||
                        "",

                    note:
                        warningNote,

                    /*
                     * QUAN TRỌNG:
                     *
                     * Trước đây:
                     *
                     * details: []
                     *
                     * Bây giờ lưu Điện + Nước +
                     * toàn bộ dịch vụ đi kèm.
                     */
                    details:
                        invoiceDetails,
                });


            await newInvoice.save();


            if (
                resolvedRoomId &&
                (
                    req.body.electricityNew !==
                    undefined ||

                    req.body.waterNew !==
                    undefined ||

                    req.body.serviceIndices !==
                    undefined
                )
            ) {
                await syncRoomMeterReadings({
                    roomId:
                        resolvedRoomId,

                    electricityNew:
                        newInvoice.electricityNew,

                    waterNew:
                        newInvoice.waterNew,

                    reason:
                        'single-invoice',
                });
            }


            await triggerInvoiceNotification(
                newInvoice
            );


            /*
             * Populate ngay trước khi trả response.
             */
            const populatedInvoice =
                await Invoice.findById(
                    newInvoice._id
                )
                    .populate(
                        'details.serviceId',
                        'name code unit type billingMode'
                    );


            return res
                .status(201)
                .json({
                    success:
                        true,

                    message:
                        "Xuất hóa đơn thành công!",

                    data:
                        populatedInvoice
                });
        }


        /*
         * =====================================================
         * LOGIC API CŨ
         * =====================================================
         */
        const contract =
            await Contract.findById(
                contractId
            )
                .populate(
                    'services.serviceId'
                );


        if (
            !contract ||
            contract.status !==
            1
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "Hợp đồng không tồn tại hoặc đã hết hiệu lực!"
                });
        }


        const previousInvoice =
            await Invoice.findOne({
                contractId
            })
                .sort({
                    createdAt:
                        -1
                });


        let totalAmount =
            contract.fixedRentPrice;


        let details =
            [];


        for (
            const item
            of contract.services
        ) {
            const service =
                item.serviceId;


            let appliedPrice =
                item.fixedPrice;


            let detailRow = {
                serviceId:
                    service._id,

                serviceName:
                    service.name,

                serviceCode:
                    service.code,

                unit:
                    service.unit,

                billingMode:
                    service.billingMode ||
                    (
                        service.type === 1
                            ? 'METER'
                            : 'FIXED'
                    ),

                appliedPrice:
                    appliedPrice
            };


            if (
                service.type ===
                1
            ) {
                const inputData =
                    serviceIndices.find(
                        s =>
                            s.serviceId.toString() ===
                            service._id.toString()
                    );


                const newIndex =
                    inputData
                        ? inputData.newIndex
                        : 0;


                let oldIndex =
                    0;


                if (previousInvoice) {
                    const prevDetail =
                        previousInvoice.details.find(
                            d =>
                                d.serviceId &&
                                d.serviceId.toString() ===
                                service._id.toString()
                        );


                    if (prevDetail) {
                        oldIndex =
                            prevDetail.newIndex;
                    }
                }


                const meter =
                    calculateMeterCharge({
                        label:
                            service.name,

                        oldIndex,

                        newIndex,

                        unitPrice:
                            appliedPrice,
                    });


                detailRow.oldIndex =
                    meter.oldIndex;


                detailRow.newIndex =
                    meter.newIndex;


                detailRow.quantity =
                    meter.usage;


                detailRow.amount =
                    meter.amount;
            } else {
                detailRow.quantity =
                    1;


                detailRow.amount =
                    roundVnd(
                        parseNonNegativeFinite(
                            appliedPrice,

                            `service.${service._id}.fixedPrice`,

                            `Đơn giá ${service.name}`
                        )
                    );
            }


            totalAmount +=
                detailRow.amount;


            details.push(
                detailRow
            );
        }


        totalAmount =
            roundVnd(
                totalAmount
            );


        const policySnapshot =
            await buildInvoicePolicySnapshot(
                req,
                req.body.issuedAt,
                totalAmount
            );


        const effectivePenalty =
            policySnapshot.isOverdue
                ? policySnapshot.penalty
                : 0;


        const newInvoice =
            new Invoice({
                contractId,

                period,

                issuedAt:
                    policySnapshot.issuedAt,

                graceDaysSnapshot:
                    policySnapshot.graceDaysSnapshot,

                penaltyRateSnapshot:
                    policySnapshot.penaltyRateSnapshot,

                overdueAt:
                    policySnapshot.overdueAt,

                dueDate:
                    new Date(
                        policySnapshot.overdueAt.getTime() -
                        24 * 60 * 60 * 1000
                    ),

                penaltyBaseAmount:
                    policySnapshot.penaltyBaseAmount,

                penaltyAppliedAt:
                    policySnapshot.isOverdue
                        ? new Date()
                        : null,

                penalty:
                    effectivePenalty,

                totalAmount:
                    policySnapshot.penaltyBaseAmount +
                    effectivePenalty,

                status:
                    policySnapshot.isOverdue
                        ? 3
                        : 1,

                details
            });


        await newInvoice.save();


        const invoiceRoomId =
            contract?.roomId?._id ||
            contract?.roomId;


        if (invoiceRoomId) {
            await syncRoomMeterReadings({
                roomId:
                    invoiceRoomId,

                electricityNew:
                    newInvoice.electricityNew,

                waterNew:
                    newInvoice.waterNew,

                reason:
                    'manual-invoice',
            });
        }


        await triggerInvoiceNotification(
            newInvoice
        );


        res
            .status(201)
            .json({
                success:
                    true,

                message:
                    "Xuất hóa đơn thành công!",

                data:
                    newInvoice
            });
    } catch (error) {
        return sendInvoiceError(
            res,
            error,
            'Lỗi khi tạo hóa đơn'
        );
    }
};


/* =========================================================
 * GET INVOICE BY ID
 * ========================================================= */

exports.getInvoiceById = async (
    req,
    res
) => {
    try {
        await applyOverduePenalty(
            req.params.id
        );


        const invoice =
            await Invoice.findById(
                req.params.id
            )
                .populate({
                    path:
                        'contractId',

                    populate: [
                        {
                            path:
                                'roomId',

                            select:
                                'roomCode area defaultRentPrice'
                        },

                        {
                            path:
                                'tenantId',

                            select:
                                'fullName phone idCard'
                        }
                    ]
                })
                .populate(
                    'details.serviceId',
                    'name code unit type billingMode'
                );


        if (!invoice) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    message:
                        "Không tìm thấy hóa đơn!"
                });
        }


        /*
         * QUAN TRỌNG:
         * ép details vào response.
         */
        const data =
            presentInvoiceWithDetails(
                invoice
            );


        res
            .status(200)
            .json({
                success:
                    true,

                data
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    "Lỗi Server: " +
                    error.message
            });
    }
};


/* =========================================================
 * PAY INVOICE
 * ========================================================= */

exports.payInvoice = async (
    req,
    res
) => {
    try {
        const {
            method,
            gatewayReference
        } =
            req.body;


        const invoice =
            await Invoice.findById(
                req.params.id
            );


        if (!invoice) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    message:
                        "Không tìm thấy hóa đơn!"
                });
        }


        if (
            [2, 4].includes(
                invoice.status
            )
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "Hóa đơn này đã được thanh toán hoặc gộp quyết toán!"
                });
        }


        invoice.status =
            2;


        invoice.paymentMethod =
            req.body.paymentMethod ||
            method ||
            'Tiền mặt';


        invoice.transactionCode =
            gatewayReference ||
            'TXN' +
            Date.now()
                .toString()
                .slice(-6);


        await invoice.save();


        const newTransaction =
            new Transaction({
                invoiceId:
                    invoice._id,

                amount:
                    invoice.totalAmount,

                method:
                    method ||
                    'Tiền mặt',

                status:
                    1,

                gatewayReference:
                    invoice.transactionCode
            });


        await newTransaction.save();


        await notifyLandlord({
            event:
                'invoice_paid',

            contractId:
                invoice.contractId,

            entityId:
                invoice._id,
        });


        res
            .status(200)
            .json({
                success:
                    true,

                message:
                    "Thanh toán thành công và đã ghi nhận giao dịch!",

                transaction:
                    newTransaction
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    "Lỗi khi xử lý thanh toán: " +
                    error.message
            });
    }
};


/* =========================================================
 * UPDATE INVOICE
 * ========================================================= */

exports.updateInvoice = async (
    req,
    res
) => {
    try {
        const {
            status,
            paymentMethod,
            transactionCode
        } =
            req.body;


        const invoice =
            await Invoice.findById(
                req.params.id
            );


        if (!invoice) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    message:
                        "Không tìm thấy hóa đơn!"
                });
        }


        let statusChangedToPaid =
            false;


        if (
            status !==
            undefined
        ) {
            let statusNum =
                invoice.status;


            if (
                status ===
                "Nháp" ||
                status ===
                0 ||
                Number(status) ===
                0
            ) {
                statusNum =
                    0;
            } else if (
                status ===
                "Chưa thanh toán" ||
                status ===
                1 ||
                Number(status) ===
                1
            ) {
                statusNum =
                    1;
            } else if (
                status ===
                "Đã thanh toán" ||
                status ===
                2 ||
                Number(status) ===
                2
            ) {
                statusNum =
                    2;
            } else if (
                status ===
                "Quá hạn" ||
                status ===
                3 ||
                Number(status) ===
                3
            ) {
                statusNum =
                    3;
            }


            if (
                statusNum ===
                2 &&
                invoice.status !==
                2
            ) {
                statusChangedToPaid =
                    true;
            }


            if (
                statusNum ===
                3 &&
                invoice.status !==
                3
            ) {
                if (
                    !invoice.penalty ||
                    invoice.penalty ===
                    0
                ) {
                    const baseAmount =
                        invoice.totalAmount ||
                        0;


                    const penaltyAmt =
                        Math.round(
                            baseAmount *
                            0.05
                        );


                    invoice.penalty =
                        penaltyAmt;


                    invoice.totalAmount =
                        baseAmount +
                        penaltyAmt;
                }
            }


            invoice.status =
                statusNum;
        }


        if (
            paymentMethod !==
            undefined
        ) {
            invoice.paymentMethod =
                paymentMethod;
        }


        if (
            transactionCode !==
            undefined
        ) {
            invoice.transactionCode =
                transactionCode;
        }


        await invoice.save();


        if (statusChangedToPaid) {
            const newTransaction =
                new Transaction({
                    invoiceId:
                        invoice._id,

                    amount:
                        invoice.totalAmount,

                    method:
                        invoice.paymentMethod ||
                        'Tiền mặt',

                    status:
                        1,

                    gatewayReference:
                        invoice.transactionCode ||
                        ''
                });


            await newTransaction.save();
        }


        res
            .status(200)
            .json({
                success:
                    true,

                message:
                    "Cập nhật hóa đơn thành công!",

                data:
                    invoice
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    "Lỗi khi cập nhật hóa đơn: " +
                    error.message
            });
    }
};


/* =========================================================
 * GET DEBTS
 * ========================================================= */

exports.getDebts = async (
    req,
    res
) => {
    try {
        const authHeader =
            req.headers['authorization'];


        let userId =
            null;


        if (
            authHeader &&
            authHeader.startsWith(
                'Bearer '
            )
        ) {
            const token =
                authHeader.split(' ')[1];


            try {
                const decoded =
                    jwt.verify(
                        token,
                        JWT_SECRET
                    );


                userId =
                    decoded.id;
            } catch (e) { }
        }


        if (!userId) {
            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        'Chưa đăng nhập'
                });
        }


        const rooms =
            await Room.find({
                landlordId:
                    userId
            });


        const roomIds =
            rooms.map(
                r => r._id
            );


        const contracts =
            await Contract.find({
                roomId: {
                    $in:
                        roomIds
                }
            })
                .populate(
                    'roomId',
                    'roomCode'
                )
                .populate(
                    'tenantId',
                    'fullName name'
                );


        const contractIds =
            contracts.map(
                c => c._id
            );


        const unpaidInvoices =
            await Invoice.find({
                contractId: {
                    $in:
                        contractIds
                },

                status: {
                    $in:
                        [1, 3]
                }
            });


        const debtMap =
            {};


        for (
            const inv
            of unpaidInvoices
        ) {
            const contractIdStr =
                inv.contractId.toString();


            if (
                !debtMap[
                contractIdStr
                ]
            ) {
                const contract =
                    contracts.find(
                        c =>
                            c._id.toString() ===
                            contractIdStr
                    );


                debtMap[
                    contractIdStr
                ] = {
                    contractId:
                        contractIdStr,

                    room:
                        inv.room ||
                        (
                            contract &&
                                contract.roomId
                                ? contract.roomId.roomCode
                                : 'Không xác định'
                        ),

                    nguoiThue:
                        inv.tenant ||
                        (
                            contract &&
                                contract.tenantId
                                ? (
                                    contract.tenantId.fullName ||
                                    contract.tenantId.name
                                )
                                : 'Không xác định'
                        ),

                    totalDebt:
                        0,

                    unpaidInvoiceCount:
                        0,

                    invoices:
                        []
                };
            }


            debtMap[
                contractIdStr
            ].totalDebt +=
                inv.totalAmount ||
                0;


            debtMap[
                contractIdStr
            ].unpaidInvoiceCount +=
                1;


            debtMap[
                contractIdStr
            ].invoices.push(
                inv
            );
        }


        const debts =
            Object.values(
                debtMap
            )
                .sort(
                    (a, b) =>
                        b.totalDebt -
                        a.totalDebt
                );


        res
            .status(200)
            .json({
                success:
                    true,

                data:
                    debts
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    "Lỗi lấy công nợ: " +
                    error.message
            });
    }
};


/* =========================================================
 * REMIND DEBT
 * ========================================================= */

exports.remindDebt = async (
    req,
    res
) => {
    try {
        const {
            contractId
        } =
            req.params;


        const unpaidInvoices =
            await Invoice.find({
                contractId,

                status: {
                    $in:
                        [1, 3]
                }
            });


        if (
            unpaidInvoices.length ===
            0
        ) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "Phòng này không có nợ!"
                });
        }


        for (
            const inv
            of unpaidInvoices
        ) {
            inv.remindCount =
                (
                    inv.remindCount ||
                    0
                ) +
                1;


            await inv.save();


            await triggerInvoiceReminder(
                inv
            );
        }


        res
            .status(200)
            .json({
                success:
                    true,

                message:
                    `Đã gửi nhắc nợ cho ${unpaidInvoices.length} hóa đơn.`
            });
    } catch (error) {
        res
            .status(500)
            .json({
                success:
                    false,

                message:
                    "Lỗi nhắc nợ: " +
                    error.message
            });
    }
};