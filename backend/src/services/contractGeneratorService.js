const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const PDFDocument = require('pdfkit');

const Contract = require('../models/Contract');
const Account = require('../models/Account');
const { numberToVietnameseWords } = require('./vietnameseNumber');

/*
 * VERSION 5
 *
 * - Bên A có thời gian ký theo createdAt
 * - Bên B có thời gian ký theo tenantConfirmedAt / signedAt
 * - Tiêu đề hợp đồng chuyển toàn bộ sang màu đen
 */
const PDF_DOCUMENT_VERSION = 5;

const fontPaths = {
    regular: path.join(
        __dirname,
        '../../assets/fonts/Roboto-Regular.ttf'
    ),

    bold: path.join(
        __dirname,
        '../../assets/fonts/Roboto-Bold.ttf'
    ),

    italic: path.join(
        __dirname,
        '../../assets/fonts/Roboto-Italic.ttf'
    ),
};

/* =========================================================
 * FORMAT TIỀN
 * ========================================================= */

function formatVND(amount) {
    if (
        amount === undefined ||
        amount === null ||
        Number.isNaN(Number(amount))
    ) {
        return '0';
    }

    return Number(amount).toLocaleString('vi-VN');
}

/* =========================================================
 * FORMAT NGÀY
 * ========================================================= */

function formatDate(date) {
    if (!date) return '';

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
        return '';
    }

    return `${String(value.getDate()).padStart(2, '0')}/${String(
        value.getMonth() + 1
    ).padStart(2, '0')}/${value.getFullYear()}`;
}

/* =========================================================
 * FORMAT NGÀY GIỜ KÝ
 *
 * Ví dụ:
 * 18:14:32 - 04/09/2026
 *
 * Luôn dùng múi giờ Việt Nam.
 * ========================================================= */

function formatSignedAt(date) {
    if (!date) {
        return '';
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
        return '';
    }

    try {
        const formatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',

            day: '2-digit',
            month: '2-digit',
            year: 'numeric',

            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',

            hour12: false,
        });

        const parts = formatter.formatToParts(value);

        const getPart = (type) =>
            parts.find((part) => part.type === type)?.value || '';

        const hour = getPart('hour');
        const minute = getPart('minute');
        const second = getPart('second');

        const day = getPart('day');
        const month = getPart('month');
        const year = getPart('year');

        return `${hour}:${minute}:${second} - ${day}/${month}/${year}`;
    } catch {
        return value.toLocaleString('vi-VN');
    }
}

/* =========================================================
 * XỬ LÝ BASE64
 * ========================================================= */

function cleanBase64(dataUrl) {
    if (!dataUrl) {
        return null;
    }

    const base64 = String(dataUrl)
        .replace(
            /^data:image\/[a-zA-Z+.-]+;base64,/,
            ''
        )
        .trim();

    return Buffer.from(
        base64,
        'base64'
    );
}

/* =========================================================
 * LOAD DỮ LIỆU HỢP ĐỒNG
 * ========================================================= */

async function loadContractData(
    contractId,
    signatureBase64
) {
    const contract = await Contract.findById(contractId)
        .populate('roomId')
        .populate('tenantId')
        .populate('services.serviceId');

    if (!contract) {
        throw new Error(
            'Không tìm thấy hợp đồng để tạo tài liệu.'
        );
    }

    const room = contract.roomId;

    if (!room?.landlordId) {
        throw new Error(
            'Hợp đồng chưa liên kết chủ trọ của phòng.'
        );
    }

    const landlord = await Account.findById(
        room.landlordId
    );

    if (!landlord) {
        throw new Error(
            'Không tìm thấy chủ trọ được liên kết với phòng.'
        );
    }

    const tenant = contract.tenantId;

    if (!tenant) {
        throw new Error(
            'Không tìm thấy người thuê của hợp đồng.'
        );
    }

    /* =====================================================
     * TỔNG PHÍ DỊCH VỤ
     * ===================================================== */

    const fixedServicesTotal = (
        contract.services || []
    ).reduce(
        (sum, service) =>
            sum +
            (
                Number(
                    service.fixedPrice
                ) || 0
            ),
        0
    );

    const propertyAddress =
        contract.propertyAddress ||
        landlord.propertyAddress ||
        room.propertyAddress ||
        'Cơ sở nhà trọ TroHub';

    /* =====================================================
     * THỜI GIAN KÝ BÊN A
     *
     * Bên A được xem là xác nhận/ký
     * tại thời điểm tạo hợp đồng.
     * ===================================================== */

    const landlordSignedAt =
        contract.createdAt ||
        new Date();

    /* =====================================================
     * THỜI GIAN KÝ BÊN B
     *
     * Ưu tiên tenantConfirmedAt vì đây là lúc
     * Tenant thực sự xác nhận hợp đồng.
     *
     * signedAt dùng để tương thích dữ liệu cũ.
     * ===================================================== */

    let tenantSignedAt =
        contract.tenantConfirmedAt ||
        contract.signedAt ||
        null;

    /*
     * Hợp đồng cũ có chữ ký nhưng chưa có thời gian ký.
     */
    if (
        !tenantSignedAt &&
        signatureBase64
    ) {
        tenantSignedAt =
            new Date();

        if (!contract.signedAt) {
            contract.signedAt =
                tenantSignedAt;
        }
    }

    /* =====================================================
     * NGÀY HIỂN THỊ Ở ĐẦU HỢP ĐỒNG
     *
     * Nếu Tenant đã ký:
     * => dùng ngày Tenant ký.
     *
     * Nếu chưa:
     * => dùng ngày chủ trọ tạo hợp đồng.
     * ===================================================== */

    const signDate =
        tenantSignedAt ||
        landlordSignedAt ||
        contract.startDate ||
        new Date();

    const d = new Date(
        signDate
    );

    const ngay_ky = String(
        d.getDate()
    ).padStart(
        2,
        '0'
    );

    const thang_ky = String(
        d.getMonth() + 1
    ).padStart(
        2,
        '0'
    );

    const nam_ky = String(
        d.getFullYear()
    );

    /* =====================================================
     * THỜI HẠN HỢP ĐỒNG
     * ===================================================== */

    let thoi_han_thang = 12;

    if (
        contract.startDate &&
        contract.endDate
    ) {
        const start = new Date(
            contract.startDate
        );

        const end = new Date(
            contract.endDate
        );

        const diffMonths =
            (
                end.getFullYear() -
                start.getFullYear()
            ) *
                12 +
            (
                end.getMonth() -
                start.getMonth()
            );

        thoi_han_thang = Math.max(
            1,
            diffMonths
        );
    }

    /* =====================================================
     * GIÁ THUÊ BẰNG CHỮ
     * ===================================================== */

    let gia_thue_bang_chu = '';

    try {
        if (
            contract.fixedRentPrice != null
        ) {
            gia_thue_bang_chu =
                numberToVietnameseWords(
                    Math.round(
                        contract.fixedRentPrice
                    )
                );
        }
    } catch {
        gia_thue_bang_chu = '';
    }

    /* =====================================================
     * TIỀN CỌC BẰNG CHỮ
     * ===================================================== */

    let tien_coc_bang_chu = '';

    try {
        if (
            contract.fixedDeposit != null
        ) {
            tien_coc_bang_chu =
                numberToVietnameseWords(
                    Math.round(
                        contract.fixedDeposit
                    )
                );
        }
    } catch {
        tien_coc_bang_chu = '';
    }

    /* =====================================================
     * MÃ HỢP ĐỒNG
     * ===================================================== */

    const contractShortId =
        contract._id
            ? contract._id
                  .toString()
                  .slice(-6)
                  .toUpperCase()
            : '000000';

    const so_hop_dong =
        `HD-${room.roomCode || 'P'}/${contractShortId}`;

    /* =====================================================
     * DATA ĐƯA VÀO PDF / HTML
     * ===================================================== */

    const data = {
        so_hop_dong,

        ngay_ky,
        thang_ky,
        nam_ky,

        /*
         * BÊN A:
         * thời gian tạo hợp đồng.
         */
        thoi_gian_ky_chu_tro:
            formatSignedAt(
                landlordSignedAt
            ),

        /*
         * BÊN B:
         * thời gian thực tế người thuê ký.
         */
        thoi_gian_ky_nguoi_thue:
            formatSignedAt(
                tenantSignedAt
            ),

        /*
         * Alias cũ.
         */
        thoi_gian_ky:
            formatSignedAt(
                tenantSignedAt
            ),

        /* =========================
         * BÊN CHO THUÊ
         * ========================= */

        ten_chu_tro:
            landlord.fullName ||
            '.....................................................',

        cccd_chu_tro:
            landlord.idCard ||
            '........................',

        sdt_chu_tro:
            landlord.phone ||
            '........................',

        email_chu_tro:
            landlord.email ||
            '',

        dia_chi_chu_tro:
            landlord.propertyAddress ||
            propertyAddress,

        stk_chu_tro:
            landlord.bankAccountNo ||
            '........................',

        ngan_hang_chu_tro:
            landlord.bankId ||
            '........................',

        ten_tai_khoan_chu_tro:
            landlord.bankAccountName ||
            landlord.fullName ||
            '',

        /* =========================
         * BÊN THUÊ
         * ========================= */

        ten_nguoi_thue:
            tenant.fullName ||
            '.....................................................',

        cccd_nguoi_thue:
            tenant.idCard ||
            '........................',

        sdt_nguoi_thue:
            tenant.phone ||
            '........................',

        email_nguoi_thue:
            tenant.email ||
            '',

        dia_chi_nguoi_thue:
            tenant.propertyAddress ||
            'Theo đăng ký thường trú/CCCD',

        /* =========================
         * PHÒNG
         * ========================= */

        ma_phong:
            room.roomCode ||
            '................',

        tang_phong:
            room.floor != null
                ? String(
                      room.floor
                  )
                : '1',

        dien_tich_phong:
            room.area ||
            '20',

        dia_chi_nha_tro:
            propertyAddress,

        chi_so_dien_ban_dau:
            String(
                contract.initialElectricity != null
                    ? contract.initialElectricity
                    : room.lastElectricityReading != null
                      ? room.lastElectricityReading
                      : 0
            ),

        chi_so_nuoc_ban_dau:
            String(
                contract.initialWater != null
                    ? contract.initialWater
                    : room.lastWaterReading != null
                      ? room.lastWaterReading
                      : 0
            ),

        /* =========================
         * TÀI CHÍNH
         * ========================= */

        gia_thue:
            formatVND(
                contract.fixedRentPrice
            ),

        gia_thue_bang_chu:
            gia_thue_bang_chu ||
            '.....................................................',

        tien_coc:
            formatVND(
                contract.fixedDeposit
            ),

        tien_coc_bang_chu:
            tien_coc_bang_chu ||
            '.....................................................',

        ngay_bat_dau:
            formatDate(
                contract.startDate
            ),

        ngay_ket_thuc:
            formatDate(
                contract.endDate
            ),

        thoi_han_thang:
            String(
                thoi_han_thang
            ),

        ngay_giao_phong:
            formatDate(
                contract.handoverDate ||
                contract.startDate
            ),

        gia_dien:
            contract.electricityPrice == null
                ? '0'
                : formatVND(
                      contract.electricityPrice
                  ),

        gia_nuoc:
            contract.waterPrice == null
                ? '0'
                : formatVND(
                      contract.waterPrice
                  ),

        phi_dich_vu:
            formatVND(
                fixedServicesTotal
            ),

        ngay_thanh_toan_hang_thang:
            'từ ngày 01 đến ngày 05',
    };

    return {
        contract,

        data,

        signatureBuffer:
            cleanBase64(
                signatureBase64 ||
                contract.tenantSignature
            ),

        landlordSignatureBuffer:
            cleanBase64(
                contract.landlordSignature ||
                landlord.landlordSignature
            ),

        landlordSignatureBase64:
            contract.landlordSignature ||
            landlord.landlordSignature ||
            '',

        tenantSignatureBase64:
            signatureBase64 ||
            contract.tenantSignature ||
            '',
    };
}

/* =========================================================
 * GENERATE DOCUMENTS
 * ========================================================= */

async function generateContractDocuments(
    contractId,
    signatureBase64,
    options = {}
) {
    const {
        includeDocx: wantsDocx = false,
        includePdf = true,
    } = options;

    const contractsDir = path.join(
        __dirname,
        '../../storage/contracts'
    );

    fs.mkdirSync(
        contractsDir,
        {
            recursive: true,
        }
    );

    const templatePath = path.join(
        __dirname,
        '../../templates/hop-dong-thue-nha-tro.docx'
    );

    if (
        !fs.existsSync(
            templatePath
        )
    ) {
        await require(
            '../../scripts/generateTemplateDocx'
        ).createContractTemplate();
    }

    const {
        contract,
        data,
        signatureBuffer,
        landlordSignatureBuffer,
    } = await loadContractData(
        contractId,
        signatureBase64
    );

    const includeDocx =
        wantsDocx &&
        !signatureBase64 &&
        contract.status === 0;

    const docxFilePath = path.join(
        contractsDir,
        `hop-dong-${contract._id}.docx`
    );

    const pdfFilePath = path.join(
        contractsDir,
        `hop-dong-${contract._id}.pdf`
    );

    /* =====================================================
     * DOCX
     * ===================================================== */

    if (includeDocx) {
        try {
            const zip = new PizZip(
                fs.readFileSync(
                    templatePath,
                    'binary'
                )
            );

            const imageModule =
                new ImageModule({
                    centered: true,

                    getImage: () =>
                        signatureBuffer ||
                        Buffer.from(
                            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                            'base64'
                        ),

                    getSize: () => [
                        160,
                        70,
                    ],
                });

            const doc =
                new Docxtemplater(
                    zip,
                    {
                        modules: [
                            imageModule,
                        ],

                        paragraphLoop:
                            true,

                        linebreaks:
                            true,
                    }
                );

            doc.render({
                ...data,

                chu_ky_nguoi_thue:
                    'signature',
            });

            fs.writeFileSync(
                docxFilePath,

                doc
                    .getZip()
                    .generate({
                        type:
                            'nodebuffer',

                        compression:
                            'DEFLATE',
                    })
            );
        } catch (error) {
            console.error(
                '[DOCX_GENERATION_ERROR]',
                error
            );
        }
    }

    /* =====================================================
     * PDF
     * ===================================================== */

    if (includePdf) {
        await generatePdfFile(
            pdfFilePath,
            data,
            signatureBuffer,
            landlordSignatureBuffer
        );

        contract.pdfVersion =
            PDF_DOCUMENT_VERSION;

        contract.pdfUrl =
            `/api/contracts/${contract._id}/pdf`;
    }

    /* =====================================================
     * LƯU CHỮ KÝ NGƯỜI THUÊ
     *
     * Không được ghi đè signedAt mỗi lần generate PDF.
     * ===================================================== */

    if (signatureBase64) {
        contract.tenantSignature =
            signatureBase64;

        if (!contract.signedAt) {
            contract.signedAt =
                contract.tenantConfirmedAt ||
                new Date();
        }
    }

    if (
        includePdf &&
        (
            signatureBase64 ||
            contract.status >= 1
        )
    ) {
        fs.rmSync(
            docxFilePath,
            {
                force: true,
            }
        );
    }

    if (includeDocx) {
        contract.docxUrl =
            undefined;
    }

    await contract.save();

    return {
        docxUrl:
            undefined,

        pdfUrl:
            includePdf
                ? contract.pdfUrl
                : undefined,

        docxFilePath:
            includeDocx
                ? docxFilePath
                : undefined,

        pdfFilePath:
            includePdf
                ? pdfFilePath
                : undefined,
    };
}

/* =========================================================
 * GENERATE PDF
 * ========================================================= */

async function generateContractPdf(
    contractIdOrOptions,
    signatureBase64
) {
    if (
        contractIdOrOptions &&
        typeof contractIdOrOptions ===
            'object' &&
        contractIdOrOptions.outputPath
    ) {
        return generatePdfFile(
            contractIdOrOptions.outputPath,
            contractIdOrOptions.data,
            contractIdOrOptions.signatureBuffer,
            contractIdOrOptions.landlordSignatureBuffer
        );
    }

    return generateContractDocuments(
        contractIdOrOptions,
        signatureBase64,
        {
            includeDocx: false,
            includePdf: true,
        }
    );
}

/* =========================================================
 * GENERATE DOCX
 * ========================================================= */

function generateContractDocx(
    contractId,
    signatureBase64
) {
    return generateContractDocuments(
        contractId,
        signatureBase64,
        {
            includeDocx: true,
            includePdf: false,
        }
    );
}

/* =========================================================
 * TẠO FILE PDF
 * ========================================================= */

function generatePdfFile(
    outputPath,
    data,
    signatureBuffer,
    landlordSignatureBuffer
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const tempPath =
                `${outputPath}.tmp-${process.pid}-${Date.now()}`;

            const doc =
                new PDFDocument({
                    size: 'A4',

                    margins: {
                        top: 40,
                        bottom: 40,
                        left: 50,
                        right: 50,
                    },

                    bufferPages: true,
                });

            try {
                doc.registerFont(
                    'Roboto',
                    fontPaths.regular
                );

                doc.registerFont(
                    'Roboto-Bold',
                    fontPaths.bold
                );

                doc.registerFont(
                    'Roboto-Italic',
                    fontPaths.italic
                );
            } catch (error) {
                reject(
                    error
                );

                return;
            }

            const stream =
                fs.createWriteStream(
                    tempPath
                );

            doc.pipe(
                stream
            );

            /* =================================================
             * QUỐC HIỆU
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    12
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    {
                        align:
                            'center',
                    }
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    10.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Độc lập - Tự do - Hạnh phúc',
                    {
                        align:
                            'center',
                    }
                );

            doc
                .fontSize(
                    10
                )
                .text(
                    '-----------------------------------',
                    {
                        align:
                            'center',
                    }
                )
                .moveDown(
                    0.5
                );

            /* =================================================
             * NGÀY LẬP
             * ================================================= */

            doc
                .font(
                    'Roboto-Italic'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    `Hôm nay, ngày ${data.ngay_ky} tháng ${data.thang_ky} năm ${data.nam_ky}`,
                    {
                        align:
                            'right',
                    }
                )
                .moveDown(
                    0.4
                );

            /* =================================================
             * TIÊU ĐỀ
             *
             * ĐÃ ĐỔI SANG MÀU ĐEN
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    15
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'HỢP ĐỒNG THUÊ NHÀ Ở',
                    {
                        align:
                            'center',
                    }
                )
                .moveDown(
                    0.2
                );

            doc
                .font(
                    'Roboto-Italic'
                )
                .fontSize(
                    9.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    `Số: ${data.so_hop_dong || '...'} / HĐTN`,
                    {
                        align:
                            'center',
                    }
                )
                .moveDown(
                    0.6
                );

            /* =================================================
             * CĂN CỨ PHÁP LÝ
             * ================================================= */

            doc
                .font(
                    'Roboto-Italic'
                )
                .fontSize(
                    8.5
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                '- Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;'
            );

            doc.text(
                '- Căn cứ Luật Nhà ở ngày 27 tháng 11 năm 2023;'
            );

            doc.text(
                '- Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023;'
            );

            doc.text(
                '- Căn cứ nhu cầu và khả năng thực tế của hai bên.'
            );

            doc.moveDown(
                0.6
            );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Hai bên chúng tôi thống nhất ký kết hợp đồng thuê nhà ở với các nội dung sau:'
                )
                .moveDown(
                    0.4
                );

            /* =================================================
             * HELPER
             * ================================================= */

            const printField = (
                label,
                value
            ) => {
                doc
                    .font(
                        'Roboto'
                    )
                    .fillColor(
                        '#000000'
                    )
                    .text(
                        `- ${label}: `,
                        {
                            continued:
                                true,
                        }
                    );

                doc
                    .font(
                        'Roboto-Bold'
                    )
                    .text(
                        value ||
                        '........................'
                    );
            };

            /* =================================================
             * I. BÊN A
             *
             * ĐÃ ĐỔI SANG MÀU ĐEN
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'I. BÊN CHO THUÊ NHÀ Ở (BÊN A):'
                );

            doc
                .fontSize(
                    9.5
                )
                .fillColor(
                    '#000000'
                );

            printField(
                'Họ và tên',
                data.ten_chu_tro
            );

            printField(
                'Số CCCD/CMND',
                data.cccd_chu_tro
            );

            printField(
                'Điện thoại liên hệ',
                data.sdt_chu_tro
            );

            printField(
                'Địa chỉ cư trú / Cơ sở',
                data.dia_chi_chu_tro
            );

            if (
                data.stk_chu_tro &&
                data.stk_chu_tro !==
                    '........................'
            ) {
                doc
                    .font(
                        'Roboto'
                    )
                    .text(
                        '- Số tài khoản nhận tiền: ',
                        {
                            continued:
                                true,
                        }
                    )
                    .font(
                        'Roboto-Bold'
                    )
                    .text(
                        data.stk_chu_tro,
                        {
                            continued:
                                true,
                        }
                    )
                    .font(
                        'Roboto'
                    )
                    .text(
                        ' tại Ngân hàng: ',
                        {
                            continued:
                                true,
                        }
                    )
                    .font(
                        'Roboto-Bold'
                    )
                    .text(
                        data.ngan_hang_chu_tro,
                        {
                            continued:
                                true,
                        }
                    )
                    .font(
                        'Roboto'
                    )
                    .text(
                        ` (${data.ten_tai_khoan_chu_tro})`
                    );
            }

            doc.moveDown(
                0.5
            );

            /* =================================================
             * II. BÊN B
             *
             * ĐÃ ĐỔI SANG MÀU ĐEN
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'II. BÊN THUÊ NHÀ Ở (BÊN B):'
                );

            doc
                .fontSize(
                    9.5
                )
                .fillColor(
                    '#000000'
                );

            printField(
                'Họ và tên',
                data.ten_nguoi_thue
            );

            printField(
                'Số CCCD/CMND',
                data.cccd_nguoi_thue
            );

            printField(
                'Điện thoại liên hệ',
                data.sdt_nguoi_thue
            );

            printField(
                'Nơi đăng ký cư trú / Địa chỉ',
                data.dia_chi_nguoi_thue
            );

            doc.moveDown(
                0.6
            );

            /* =================================================
             * ĐIỀU 1
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 1. Các thông tin về nhà ở cho thuê'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                '1.1. Loại nhà ở: Phòng trọ / Căn hộ mini khép kín trong khuôn viên nhà ở.'
            );

            doc
                .text(
                    '1.2. Vị trí, địa điểm: Phòng số ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.ma_phong,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ` (Tầng ${data.tang_phong}), tại địa chỉ: `,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.dia_chi_nha_tro,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '.'
                );

            doc
                .text(
                    '1.3. Diện tích sử dụng: Khoảng ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.dien_tich_phong} m²`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '; Công năng sử dụng: Để ở sinh hoạt.'
                );

            doc.text(
                '1.4. Hiện trạng bàn giao: Phòng kiên cố, hệ thống điện nước, cửa khóa an toàn và trang thiết bị kèm theo hoạt động tốt.'
            );

            doc
                .text(
                    '1.5. Chỉ số đồng hồ ban đầu khi bàn giao: Điện: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.chi_so_dien_ban_dau} kWh`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '; Nước: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.chi_so_nuoc_ban_dau} m³`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '.'
                );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 2
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 2. Giá thuê nhà ở, tiền cọc và chi phí dịch vụ'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc
                .text(
                    '2.1. Giá thuê phòng cố định: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.gia_thue} VNĐ/tháng`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' (Bằng chữ: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.gia_thue_bang_chu,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ').'
                );

            doc
                .text(
                    '2.2. Tiền đặt cọc giữ phòng: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.tien_coc} VNĐ`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' (Bằng chữ: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.tien_coc_bang_chu,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '). Khoản cọc được Bên A hoàn trả lại cho Bên B khi kết thúc hợp đồng sau khi đã khấu trừ hết các nghĩa vụ tài chính chưa thanh toán (nếu có).'
                );

            doc
                .text(
                    '2.3. Đơn giá điện tiêu thụ: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.gia_dien} VNĐ/kWh`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' (Tính theo chỉ số công tơ thực tế hàng tháng).'
                );

            doc
                .text(
                    '2.4. Đơn giá nước sinh hoạt: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.gia_nuoc} VNĐ/m³`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' (Tính theo chỉ số đồng hồ thực tế hàng tháng).'
                );

            doc
                .text(
                    '2.5. Chi phí dịch vụ cố định (rác, wifi, vệ sinh chung...): ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.phi_dich_vu} VNĐ/tháng`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '.'
                );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 3
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 3. Phương thức và thời hạn thanh toán'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                '3.1. Phương thức thanh toán: Chuyển khoản ngân hàng (qua số tài khoản của Bên A hoặc quét mã VietQR tự động trên ứng dụng TroHub) hoặc tiền mặt.'
            );

            doc
                .text(
                    '3.2. Thời hạn thanh toán: Định kỳ hàng tháng ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.ngay_thanh_toan_hang_thang,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' sau khi Bên A phát hành hóa đơn trên TroHub.'
                );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 4
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 4. Thời hạn thuê, thời điểm bàn giao nhà ở'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc
                .text(
                    '4.1. Thời hạn thuê: ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    `${data.thoi_han_thang} tháng`,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ', từ ngày ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.ngay_bat_dau,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' đến hết ngày ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.ngay_ket_thuc,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '.'
                );

            doc
                .text(
                    '4.2. Thời điểm bàn giao phòng: Ngày ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.ngay_giao_phong ||
                    data.ngay_bat_dau,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    '.'
                );

            doc.text(
                '4.3. Hồ sơ kèm theo: Biên bản bàn giao hiện trạng phòng, chỉ số điện nước và Nội quy phòng trọ.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 5
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 5. Sử dụng nhà ở thuê và bảo đảm an toàn'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                '5.1. Bên B sử dụng nhà ở đúng mục đích để ở; chấp hành nghiêm chỉnh các quy định pháp luật về đăng ký tạm trú, an ninh trật tự và phòng cháy chữa cháy (PCCC).'
            );

            doc.text(
                '5.2. Nghiêm cấm tàng trữ chất cấm, vũ khí, chất cháy nổ và các hoạt động vi phạm pháp luật trong khuôn viên nhà trọ.'
            );

            doc.text(
                '5.3. Bên B có trách nhiệm giữ gìn vệ sinh chung, bảo quản tài sản và trang thiết bị được bàn giao.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 6
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 6. Quyền và nghĩa vụ của Bên cho thuê'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                '6.1. Bàn giao phòng và trang thiết bị cho Bên B đúng thời hạn đã thỏa thuận.'
            );

            doc.text(
                '6.2. Bảo đảm quyền sử dụng ổn định, riêng tư cho Bên B trong suốt thời hạn hợp đồng.'
            );

            doc.text(
                '6.3. Kịp thời tiếp nhận và xử lý các sự cố kỹ thuật hạ tầng (điện, nước, internet) khi Bên B gửi yêu cầu hỗ trợ.'
            );

            doc.text(
                '6.4. Thu đúng, đủ các khoản tiền thuê và dịch vụ theo thỏa thuận.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 7
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 7. Quyền và nghĩa vụ của Bên thuê'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                '7.1. Nhận bàn giao phòng và sử dụng đúng công năng, diện tích đã thỏa thuận.'
            );

            doc.text(
                '7.2. Thanh toán tiền phòng và chi phí điện nước, dịch vụ đúng hạn.'
            );

            doc.text(
                '7.3. Tự bảo quản tài sản cá nhân; không tự ý đục phá, sửa chữa, thay đổi kết cấu phòng khi chưa có sự đồng ý bằng văn bản của Bên A.'
            );

            doc.text(
                '7.4. Bồi thường thiệt hại thực tế nếu làm hư hỏng, mất mát tài sản của Bên A.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 8
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 8. Trách nhiệm do vi phạm hợp đồng và Bất khả kháng'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                'Bên nào vi phạm nghĩa vụ hợp đồng gây thiệt hại cho bên kia thì phải chịu trách nhiệm bồi thường theo quy định pháp luật, trừ trường hợp xảy ra sự kiện bất khả kháng (thiên tai, dịch bệnh, hỏa hoạn không do lỗi các bên) theo quy định của Bộ luật Dân sự.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 9
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 9. Phạt vi phạm hợp đồng'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                'Nếu Bên B tự ý chấm dứt hợp đồng trước thời hạn mà không thông báo trước tối thiểu 30 ngày hoặc vi phạm nghiêm trọng nội quy thì sẽ không được hoàn trả khoản tiền đặt cọc giữ phòng.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 10
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 10. Chấm dứt hợp đồng và thanh lý'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                'Hợp đồng chấm dứt khi: Hết thời hạn thuê; hai bên thỏa thuận chấm dứt; hoặc một bên đơn phương chấm dứt hợp pháp. Khi chấm dứt, hai bên cùng chốt chỉ số điện nước cuối kỳ, bàn giao lại phòng và hoàn tất thanh toán/hoàn trả tiền cọc.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 11
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 11. Giải quyết tranh chấp'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc.text(
                'Mọi tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng hòa giải. Trường hợp không thể tự thương lượng, tranh chấp sẽ được yêu cầu Tòa án nhân dân có thẩm quyền tại địa phương nơi có bất động sản giải quyết.'
            );

            doc.moveDown(
                0.5
            );

            /* =================================================
             * ĐIỀU 12
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'Điều 12. Hiệu lực của hợp đồng'
                );

            doc
                .font(
                    'Roboto'
                )
                .fontSize(
                    9
                )
                .fillColor(
                    '#000000'
                );

            doc
                .text(
                    '12.1. Hợp đồng này có hiệu lực kể từ ngày ',
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto-Bold'
                )
                .text(
                    data.ngay_bat_dau,
                    {
                        continued:
                            true,
                    }
                )
                .font(
                    'Roboto'
                )
                .text(
                    ' sau khi hai bên ký xác nhận.'
                );

            doc.text(
                '12.2. Hợp đồng điện tử gồm 12 điều, được khởi tạo, ký số/ký điện tử và lưu trữ an toàn trên nền tảng TroHub, có giá trị pháp lý ràng buộc quyền và nghĩa vụ của các bên tương đương văn bản giấy.'
            );

            doc.moveDown(
                0.8
            );

            /* =================================================
             * CHỮ KÝ
             * ================================================= */

            const yStart =
                doc.y;

            const colWidth =
                230;

            /* =================================================
             * BÊN A
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)',
                    50,
                    yStart,
                    {
                        width:
                            colWidth,

                        align:
                            'center',
                    }
                );

            doc
                .font(
                    'Roboto-Italic'
                )
                .fontSize(
                    8.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    '(Ký, ghi rõ họ tên)',
                    50,
                    yStart + 14,
                    {
                        width:
                            colWidth,

                        align:
                            'center',
                    }
                );

            if (
                landlordSignatureBuffer
            ) {
                try {
                    doc.image(
                        landlordSignatureBuffer,
                        100,
                        yStart + 30,
                        {
                            fit: [
                                130,
                                45,
                            ],

                            align:
                                'center',
                        }
                    );
                } catch (error) {
                    console.error(
                        '[PDF_LANDLORD_SIGNATURE]',
                        error.message
                    );
                }
            }

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    data.ten_chu_tro,
                    50,
                    yStart + 80,
                    {
                        width:
                            colWidth,

                        align:
                            'center',
                    }
                );

            /*
             * THỜI GIAN KÝ BÊN A
             *
             * = contract.createdAt
             */
            if (
                data.thoi_gian_ky_chu_tro
            ) {
                doc
                    .font(
                        'Roboto'
                    )
                    .fontSize(
                        8
                    )
                    .fillColor(
                        '#000000'
                    )
                    .text(
                        `Đã ký lúc: ${data.thoi_gian_ky_chu_tro}`,
                        50,
                        yStart + 96,
                        {
                            width:
                                colWidth,

                            align:
                                'center',
                        }
                    );
            }

            /* =================================================
             * BÊN B
             * ================================================= */

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    'ĐẠI DIỆN BÊN THUÊ (BÊN B)',
                    310,
                    yStart,
                    {
                        width:
                            colWidth,

                        align:
                            'center',
                    }
                );

            doc
                .font(
                    'Roboto-Italic'
                )
                .fontSize(
                    8.5
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    '(Đã ký điện tử qua TroHub)',
                    310,
                    yStart + 14,
                    {
                        width:
                            colWidth,

                        align:
                            'center',
                    }
                );

            if (
                signatureBuffer
            ) {
                try {
                    doc.image(
                        signatureBuffer,
                        360,
                        yStart + 30,
                        {
                            fit: [
                                130,
                                45,
                            ],

                            align:
                                'center',
                        }
                    );
                } catch (error) {
                    console.error(
                        '[PDF_SIGNATURE]',
                        error.message
                    );
                }
            }

            doc
                .font(
                    'Roboto-Bold'
                )
                .fontSize(
                    10
                )
                .fillColor(
                    '#000000'
                )
                .text(
                    data.ten_nguoi_thue,
                    310,
                    yStart + 80,
                    {
                        width:
                            colWidth,

                        align:
                            'center',
                    }
                );

            /*
             * THỜI GIAN KÝ BÊN B
             *
             * = tenantConfirmedAt || signedAt
             */
            if (
                signatureBuffer &&
                data.thoi_gian_ky_nguoi_thue
            ) {
                doc
                    .font(
                        'Roboto'
                    )
                    .fontSize(
                        8
                    )
                    .fillColor(
                        '#000000'
                    )
                    .text(
                        `Đã ký lúc: ${data.thoi_gian_ky_nguoi_thue}`,
                        310,
                        yStart + 96,
                        {
                            width:
                                colWidth,

                            align:
                                'center',
                        }
                    );
            }

            doc.end();

            stream.on(
                'finish',
                () => {
                    try {
                        fs.renameSync(
                            tempPath,
                            outputPath
                        );

                        resolve();
                    } catch (error) {
                        reject(
                            error
                        );
                    }
                }
            );

            stream.on(
                'error',
                (error) => {
                    fs.rmSync(
                        tempPath,
                        {
                            force:
                                true,
                        }
                    );

                    reject(
                        error
                    );
                }
            );
        }
    );
}

/* =========================================================
 * HTML PREVIEW
 * ========================================================= */

function renderContractHtml(
    data,
    landlordSignature,
    tenantSignature
) {
    return `<!DOCTYPE html>
<html lang="vi">

<head>

<meta charset="utf-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
Hợp đồng thuê nhà ở - ${data.so_hop_dong || 'TroHub'}
</title>

<style>

* {
    box-sizing: border-box;
}

body {
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Helvetica,
        Arial,
        sans-serif;

    background-color:
        #f1f5f9;

    margin:
        0;

    padding:
        20px 12px;

    color:
        #000000;

    line-height:
        1.6;
}

.page {
    background:
        #ffffff;

    max-width:
        800px;

    margin:
        0 auto;

    padding:
        40px 36px;

    border-radius:
        12px;

    box-shadow:
        0 4px 16px
        rgba(
            0,
            0,
            0,
            0.08
        );
}

.header {
    text-align:
        center;

    margin-bottom:
        20px;
}

.header h3 {
    font-size:
        13.5px;

    font-weight:
        800;

    text-transform:
        uppercase;

    margin:
        0;

    letter-spacing:
        0.2px;

    color:
        #000000;
}

.header h4 {
    font-size:
        12px;

    font-weight:
        600;

    margin:
        4px 0 0 0;

    color:
        #000000;
}

.divider {
    width:
        140px;

    height:
        1px;

    background:
        #000000;

    margin:
        8px auto 14px auto;
}

.date-row {
    text-align:
        right;

    font-size:
        11.5px;

    font-style:
        italic;

    color:
        #000000;

    margin-bottom:
        12px;
}

/*
 * TIÊU ĐỀ HỢP ĐỒNG
 * MÀU ĐEN
 */
.title {
    font-size:
        19px;

    font-weight:
        900;

    color:
        #000000;

    text-align:
        center;

    text-transform:
        uppercase;

    margin-bottom:
        4px;
}

.sub-number {
    font-size:
        12px;

    font-style:
        italic;

    color:
        #000000;

    text-align:
        center;

    margin-bottom:
        18px;
}

.legal-bases {
    background:
        #f8fafc;

    border-left:
        3px solid
        #000000;

    padding:
        10px 14px;

    font-size:
        11.5px;

    font-style:
        italic;

    color:
        #000000;

    margin-bottom:
        18px;

    border-radius:
        0 8px 8px 0;
}

.legal-bases p {
    margin:
        2px 0;
}

.intro-text {
    font-size:
        12.5px;

    margin-bottom:
        16px;

    font-weight:
        500;

    color:
        #000000;
}

/*
 * BÊN A / BÊN B
 * MÀU ĐEN
 */
.section-header {
    font-size:
        13px;

    font-weight:
        800;

    color:
        #000000;

    text-transform:
        uppercase;

    margin:
        18px 0 8px 0;

    border-bottom:
        1px solid
        #e2e8f0;

    padding-bottom:
        4px;
}

.info-list {
    font-size:
        12.5px;

    margin:
        0 0 14px 0;

    padding-left:
        0;

    list-style:
        none;

    color:
        #000000;
}

.info-list li {
    margin-bottom:
        5px;
}

.article-title {
    font-size:
        13px;

    font-weight:
        800;

    color:
        #000000;

    margin:
        18px 0 6px 0;
}

.article-body {
    font-size:
        12.5px;

    margin:
        0 0 6px 0;

    text-align:
        justify;

    color:
        #000000;
}

strong,
b {
    font-weight:
        800;

    color:
        #000000;
}

.signatures {
    display:
        flex;

    justify-content:
        space-between;

    margin-top:
        32px;

    padding-top:
        20px;

    border-top:
        1px dashed
        #cbd5e1;
}

.sign-col {
    width:
        48%;

    text-align:
        center;
}

.sign-title {
    font-size:
        12px;

    font-weight:
        800;

    text-transform:
        uppercase;

    color:
        #000000;
}

.sign-sub {
    font-size:
        11px;

    font-style:
        italic;

    color:
        #000000;

    margin-top:
        2px;
}

.sign-box {
    height:
        80px;

    display:
        flex;

    align-items:
        center;

    justify-content:
        center;

    margin:
        10px 0;
}

.sign-img {
    max-height:
        70px;

    max-width:
        160px;

    object-fit:
        contain;
}

.sign-name {
    font-size:
        13px;

    font-weight:
        800;

    color:
        #000000;
}

.sign-time {
    margin-top:
        4px;

    color:
        #000000;

    font-size:
        10.5px;

    font-weight:
        600;
}

@media (
    max-width:
        600px
) {

    .page {
        padding:
            24px 16px;
    }

    .signatures {
        flex-direction:
            column;

        gap:
            24px;
    }

    .sign-col {
        width:
            100%;
    }
}

</style>

</head>

<body>

<div class="page">

<!-- =====================================================
     HEADER
===================================================== -->

<div class="header">

<h3>
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
</h3>

<h4>
Độc lập - Tự do - Hạnh phúc
</h4>

<div class="divider"></div>

</div>

<div class="date-row">
Hôm nay, ngày
<strong>${data.ngay_ky}</strong>
tháng
<strong>${data.thang_ky}</strong>
năm
<strong>${data.nam_ky}</strong>
</div>

<!-- =====================================================
     TIÊU ĐỀ
===================================================== -->

<div class="title">
HỢP ĐỒNG THUÊ NHÀ Ở
</div>

<div class="sub-number">
Số:
<strong>${data.so_hop_dong}</strong>
/ HĐTN
</div>

<!-- =====================================================
     CĂN CỨ
===================================================== -->

<div class="legal-bases">

<p>
- Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;
</p>

<p>
- Căn cứ Luật Nhà ở ngày 27 tháng 11 năm 2023;
</p>

<p>
- Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023;
</p>

<p>
- Căn cứ nhu cầu và khả năng thực tế của hai bên.
</p>

</div>

<div class="intro-text">
Hai bên chúng tôi thống nhất ký kết hợp đồng thuê nhà ở với các nội dung sau đây:
</div>

<!-- =====================================================
     BÊN A
===================================================== -->

<div class="section-header">
I. BÊN CHO THUÊ NHÀ Ở (BÊN A):
</div>

<ul class="info-list">

<li>
- Họ và tên:
<strong>${data.ten_chu_tro}</strong>
</li>

<li>
- Số CCCD/CMND:
<strong>${data.cccd_chu_tro}</strong>
</li>

<li>
- Điện thoại liên hệ:
<strong>${data.sdt_chu_tro}</strong>
</li>

<li>
- Địa chỉ cư trú / Cơ sở:
<strong>${data.dia_chi_chu_tro}</strong>
</li>

${
    data.stk_chu_tro &&
    data.stk_chu_tro !==
        '........................'
        ? `
<li>
- Số tài khoản nhận tiền:
<strong>${data.stk_chu_tro}</strong>
tại Ngân hàng
<strong>${data.ngan_hang_chu_tro}</strong>
(Chủ TK:
<strong>${data.ten_tai_khoan_chu_tro}</strong>)
</li>
`
        : ''
}

</ul>

<!-- =====================================================
     BÊN B
===================================================== -->

<div class="section-header">
II. BÊN THUÊ NHÀ Ở (BÊN B):
</div>

<ul class="info-list">

<li>
- Họ và tên:
<strong>${data.ten_nguoi_thue}</strong>
</li>

<li>
- Số CCCD/CMND:
<strong>${data.cccd_nguoi_thue}</strong>
</li>

<li>
- Điện thoại liên hệ:
<strong>${data.sdt_nguoi_thue}</strong>
</li>

<li>
- Nơi đăng ký cư trú / Địa chỉ:
<strong>${data.dia_chi_nguoi_thue}</strong>
</li>

</ul>

<!-- =====================================================
     ĐIỀU 1
===================================================== -->

<div class="article-title">
Điều 1. Các thông tin về nhà ở cho thuê
</div>

<div class="article-body">
1.1. Loại nhà ở:
Phòng trọ / Căn hộ mini khép kín trong khuôn viên nhà ở.
</div>

<div class="article-body">
1.2. Vị trí, địa điểm:
Phòng số
<strong>${data.ma_phong}</strong>
(Tầng
<strong>${data.tang_phong}</strong>),
tại địa chỉ:
<strong>${data.dia_chi_nha_tro}</strong>.
</div>

<div class="article-body">
1.3. Diện tích sử dụng:
Khoảng
<strong>${data.dien_tich_phong} m²</strong>;
Công năng sử dụng:
Để ở sinh hoạt.
</div>

<div class="article-body">
1.4. Hiện trạng chất lượng:
Phòng trọ kiên cố,
hệ thống điện nước,
cửa khóa an toàn và trang thiết bị kèm theo hoạt động tốt,
bảo đảm an toàn PCCC.
</div>

<div class="article-body">
1.5. Chỉ số đồng hồ khi bàn giao:
Điện:
<strong>${data.chi_so_dien_ban_dau} kWh</strong>;
Nước:
<strong>${data.chi_so_nuoc_ban_dau} m³</strong>.
</div>

<!-- =====================================================
     ĐIỀU 2
===================================================== -->

<div class="article-title">
Điều 2. Giá thuê nhà ở, tiền cọc và chi phí dịch vụ
</div>

<div class="article-body">
2.1. Giá thuê phòng cố định:
<strong>${data.gia_thue} VNĐ/tháng</strong>
(Bằng chữ:
<strong>${data.gia_thue_bang_chu}</strong>).
</div>

<div class="article-body">
2.2. Tiền đặt cọc giữ phòng:
<strong>${data.tien_coc} VNĐ</strong>
(Bằng chữ:
<strong>${data.tien_coc_bang_chu}</strong>).
Tiền đặt cọc được Bên A hoàn trả lại cho Bên B khi kết thúc hợp đồng sau khi đã khấu trừ hết các nghĩa vụ tài chính chưa thanh toán (nếu có).
</div>

<div class="article-body">
2.3. Đơn giá điện tiêu thụ:
<strong>${data.gia_dien} VNĐ/kWh</strong>
(Theo chỉ số công tơ thực tế hàng tháng).
</div>

<div class="article-body">
2.4. Đơn giá nước sinh hoạt:
<strong>${data.gia_nuoc} VNĐ/m³</strong>
(Theo chỉ số đồng hồ thực tế hàng tháng).
</div>

<div class="article-body">
2.5. Chi phí dịch vụ cố định
(rác, wifi, vệ sinh...):
<strong>${data.phi_dich_vu} VNĐ/tháng</strong>.
</div>

<!-- =====================================================
     ĐIỀU 3
===================================================== -->

<div class="article-title">
Điều 3. Phương thức và thời hạn thanh toán
</div>

<div class="article-body">
3.1. Phương thức thanh toán:
Chuyển khoản ngân hàng
(qua số tài khoản của Bên A hoặc quét mã VietQR tự động trên ứng dụng TroHub)
hoặc thanh toán tiền mặt.
</div>

<div class="article-body">
3.2. Thời hạn thanh toán:
Định kỳ hàng tháng
<strong>${data.ngay_thanh_toan_hang_thang}</strong>
sau khi Bên A phát hành hóa đơn trên hệ thống TroHub.
</div>

<!-- =====================================================
     ĐIỀU 4
===================================================== -->

<div class="article-title">
Điều 4. Thời hạn cho thuê, thời điểm bàn giao nhà ở
</div>

<div class="article-body">
4.1. Thời hạn cho thuê:
<strong>${data.thoi_han_thang} tháng</strong>,
tính từ ngày
<strong>${data.ngay_bat_dau}</strong>
đến hết ngày
<strong>${data.ngay_ket_thuc}</strong>.
</div>

<div class="article-body">
4.2. Thời điểm bàn giao phòng:
Ngày
<strong>${data.ngay_giao_phong || data.ngay_bat_dau}</strong>.
</div>

<div class="article-body">
4.3. Hồ sơ kèm theo:
Biên bản bàn giao hiện trạng phòng,
chỉ số điện nước và Nội quy phòng trọ.
</div>

<!-- =====================================================
     ĐIỀU 5
===================================================== -->

<div class="article-title">
Điều 5. Sử dụng nhà ở thuê và bảo đảm an toàn
</div>

<div class="article-body">
5.1. Bên B sử dụng nhà ở đúng mục đích để ở;
chấp hành nghiêm chỉnh các quy định pháp luật về đăng ký tạm trú,
an ninh trật tự và phòng cháy chữa cháy (PCCC).
</div>

<div class="article-body">
5.2. Nghiêm cấm tàng trữ chất cấm,
vũ khí,
chất cháy nổ và các hoạt động vi phạm pháp luật trong khuôn viên nhà trọ.
</div>

<div class="article-body">
5.3. Bên B có trách nhiệm giữ gìn vệ sinh chung,
bảo quản tài sản và trang thiết bị được bàn giao.
</div>

<!-- =====================================================
     ĐIỀU 6
===================================================== -->

<div class="article-title">
Điều 6. Quyền và nghĩa vụ của Bên cho thuê
</div>

<div class="article-body">
6.1. Bàn giao phòng và trang thiết bị cho Bên B đúng thời hạn đã thỏa thuận.
</div>

<div class="article-body">
6.2. Bảo đảm quyền sử dụng ổn định,
riêng tư cho Bên B trong suốt thời hạn hợp đồng.
</div>

<div class="article-body">
6.3. Kịp thời tiếp nhận và xử lý các sự cố kỹ thuật hạ tầng
(điện, nước, internet)
khi Bên B gửi yêu cầu hỗ trợ.
</div>

<div class="article-body">
6.4. Thu đúng,
đủ các khoản tiền thuê và dịch vụ theo thỏa thuận.
</div>

<!-- =====================================================
     ĐIỀU 7
===================================================== -->

<div class="article-title">
Điều 7. Quyền và nghĩa vụ của Bên thuê
</div>

<div class="article-body">
7.1. Nhận bàn giao phòng và sử dụng đúng công năng,
diện tích đã thỏa thuận.
</div>

<div class="article-body">
7.2. Thanh toán tiền phòng và chi phí điện nước,
dịch vụ đúng hạn.
</div>

<div class="article-body">
7.3. Tự bảo quản tài sản cá nhân;
không tự ý đục phá,
sửa chữa,
thay đổi kết cấu phòng khi chưa có sự đồng ý bằng văn bản của Bên A.
</div>

<div class="article-body">
7.4. Bồi thường thiệt hại thực tế nếu làm hư hỏng,
mất mát tài sản của Bên A.
</div>

<!-- =====================================================
     ĐIỀU 8
===================================================== -->

<div class="article-title">
Điều 8. Trách nhiệm do vi phạm hợp đồng và Bất khả kháng
</div>

<div class="article-body">
Bên nào vi phạm nghĩa vụ hợp đồng gây thiệt hại cho bên kia thì phải chịu trách nhiệm bồi thường theo quy định pháp luật,
trừ trường hợp xảy ra sự kiện bất khả kháng
(thiên tai,
dịch bệnh,
hỏa hoạn không do lỗi các bên)
theo quy định của Bộ luật Dân sự.
</div>

<!-- =====================================================
     ĐIỀU 9
===================================================== -->

<div class="article-title">
Điều 9. Phạt vi phạm hợp đồng
</div>

<div class="article-body">
Nếu Bên B tự ý chấm dứt hợp đồng trước thời hạn mà không thông báo trước tối thiểu 30 ngày hoặc vi phạm nghiêm trọng nội quy thì sẽ không được hoàn trả khoản tiền đặt cọc giữ phòng.
</div>

<!-- =====================================================
     ĐIỀU 10
===================================================== -->

<div class="article-title">
Điều 10. Chấm dứt hợp đồng và thanh lý
</div>

<div class="article-body">
Hợp đồng chấm dứt khi:
Hết thời hạn thuê;
hai bên thỏa thuận chấm dứt;
hoặc một bên đơn phương chấm dứt hợp pháp.
Khi chấm dứt,
hai bên cùng chốt chỉ số điện nước cuối kỳ,
bàn giao lại phòng và hoàn tất thanh toán/hoàn trả tiền cọc.
</div>

<!-- =====================================================
     ĐIỀU 11
===================================================== -->

<div class="article-title">
Điều 11. Giải quyết tranh chấp
</div>

<div class="article-body">
Mọi tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng hòa giải.
Trường hợp không thể tự thương lượng,
tranh chấp sẽ được yêu cầu Tòa án nhân dân có thẩm quyền tại địa phương nơi có bất động sản giải quyết.
</div>

<!-- =====================================================
     ĐIỀU 12
===================================================== -->

<div class="article-title">
Điều 12. Hiệu lực của hợp đồng
</div>

<div class="article-body">
12.1. Hợp đồng này có hiệu lực kể từ ngày
<strong>${data.ngay_bat_dau}</strong>
sau khi hai bên ký xác nhận.
</div>

<div class="article-body">
12.2. Hợp đồng điện tử gồm 12 điều,
được khởi tạo,
ký số/ký điện tử và lưu trữ an toàn trên nền tảng TroHub,
có giá trị pháp lý ràng buộc quyền và nghĩa vụ của các bên tương đương văn bản giấy.
</div>

<!-- =====================================================
     CHỮ KÝ
===================================================== -->

<div class="signatures">

<!-- ==========================
     BÊN A
========================== -->

<div class="sign-col">

<div class="sign-title">
ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)
</div>

<div class="sign-sub">
(Ký, ghi rõ họ tên)
</div>

<div class="sign-box">

${
    landlordSignature
        ? `<img
            src="${
                landlordSignature.startsWith(
                    'data:'
                )
                    ? landlordSignature
                    : 'data:image/png;base64,' +
                      landlordSignature
            }"
            class="sign-img"
            alt="Chữ ký bên A"
        />`
        : ''
}

</div>

<div class="sign-name">
${data.ten_chu_tro || ''}
</div>

${
    data.thoi_gian_ky_chu_tro
        ? `
<div class="sign-time">
Đã ký lúc:
${data.thoi_gian_ky_chu_tro}
</div>
`
        : ''
}

</div>

<!-- ==========================
     BÊN B
========================== -->

<div class="sign-col">

<div class="sign-title">
ĐẠI DIỆN BÊN THUÊ (BÊN B)
</div>

<div class="sign-sub">
(Đã ký điện tử qua TroHub)
</div>

<div class="sign-box">

${
    tenantSignature
        ? `<img
            src="${
                tenantSignature.startsWith(
                    'data:'
                )
                    ? tenantSignature
                    : 'data:image/png;base64,' +
                      tenantSignature
            }"
            class="sign-img"
            alt="Chữ ký bên B"
        />`
        : ''
}

</div>

<div class="sign-name">
${data.ten_nguoi_thue || ''}
</div>

${
    tenantSignature &&
    data.thoi_gian_ky_nguoi_thue
        ? `
<div class="sign-time">
Đã ký lúc:
${data.thoi_gian_ky_nguoi_thue}
</div>
`
        : ''
}

</div>

</div>

</div>

</body>

</html>`;
}

/* =========================================================
 * EXPORTS
 * ========================================================= */

module.exports = {
    generateContractDocuments,

    generateContractPdf,

    generateContractDocx,

    generatePdfFile,

    renderContractHtml,

    loadContractData,

    PDF_DOCUMENT_VERSION,

    fontPaths,
};