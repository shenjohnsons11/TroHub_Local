const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const PDFDocument = require('pdfkit');
const Contract = require('../models/Contract');
const Account = require('../models/Account');
<<<<<<< HEAD
const Room = require('../models/Room');

function formatVND(amount) {
    if (!amount && amount !== 0) return '0';
=======
const { numberToVietnameseWords } = require('./vietnameseNumber');

const PDF_DOCUMENT_VERSION = 1;
const fontPaths = {
    regular: path.join(__dirname, '../../assets/fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../assets/fonts/Roboto-Bold.ttf'),
    italic: path.join(__dirname, '../../assets/fonts/Roboto-Italic.ttf'),
};

function formatVND(amount) {
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '';
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
    return Number(amount).toLocaleString('vi-VN');
}

function formatDate(date) {
    if (!date) return '';
<<<<<<< HEAD
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
=======
    const value = new Date(date);
    return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
}

function cleanBase64(dataUrl) {
    if (!dataUrl) return null;
<<<<<<< HEAD
    const base64 = dataUrl.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();
    return Buffer.from(base64, 'base64');
}

/**
 * Generate DOCX and PDF documents from legal template
 */
async function generateContractDocuments(contractId, signatureBase64) {
    const contractsDir = path.join(__dirname, '../../public/contracts');
    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
    }

    const templatePath = path.join(__dirname, '../../templates/hop-dong-thue-nha-tro.docx');
    if (!fs.existsSync(templatePath)) {
        const { createContractTemplate } = require('../../scripts/generateTemplateDocx');
        if (createContractTemplate) await createContractTemplate();
    }

=======
    const base64 = String(dataUrl).replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();
    return Buffer.from(base64, 'base64');
}

async function loadContractData(contractId, signatureBase64) {
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
    const contract = await Contract.findById(contractId)
        .populate('roomId')
        .populate('tenantId')
        .populate('services.serviceId');
<<<<<<< HEAD

    if (!contract) {
        throw new Error('Không tìm thấy hợp đồng để tạo tài liệu.');
    }

    // 1. Tìm thông tin Chủ trọ (Bên A)
    const room = contract.roomId;
    let landlord = null;
    if (room?.landlordId) {
        landlord = await Account.findById(room.landlordId);
    }
    if (!landlord) {
        landlord = await Account.findOne({ role: 1 });
    }

    const tenant = contract.tenantId;
    const signatureBuffer = cleanBase64(signatureBase64 || contract.tenantSignature);

    // Tính tổng chi phí dịch vụ cố định
    const fixedServicesTotal = (contract.services || []).reduce((sum, s) => sum + (Number(s.fixedPrice) || 0), 0);

    const templateData = {
        ten_chu_tro: landlord?.fullName || 'CHỦ NHÀ TRỌ',
        cccd_chu_tro: landlord?.idCard || 'Đang cập nhật',
        sdt_chu_tro: landlord?.phone || 'Đang cập nhật',
        dia_chi_nha_tro: landlord?.propertyAddress || 'Cơ sở cho thuê TroHub',
        ten_nguoi_thue: tenant?.fullName || 'KHÁCH THUÊ',
        cccd_nguoi_thue: tenant?.idCard || 'Đang cập nhật',
        sdt_nguoi_thue: tenant?.phone || 'Đang cập nhật',
        ma_phong: room?.roomCode || 'Phòng trọ',
        gia_thue: formatVND(contract.fixedRentPrice),
        tien_coc: formatVND(contract.fixedDeposit),
        ngay_bat_dau: formatDate(contract.startDate),
        ngay_ket_thuc: formatDate(contract.endDate),
        gia_dien: formatVND(contract.electricityPrice || 3500),
        gia_nuoc: formatVND(contract.waterPrice || 20000),
        phi_dich_vu: formatVND(fixedServicesTotal),
    };

    // 2. Render file Word (.docx) bằng docxtemplater
    const docxFileName = `hop-dong-${contract._id}.docx`;
    const docxFilePath = path.join(contractsDir, docxFileName);

    try {
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        const imageOptions = {
            centered: true,
            getImage: (tagValue) => {
                if (signatureBuffer) return signatureBuffer;
                // Transparent 1x1 png fallback
                return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
            },
            getSize: () => [160, 70],
        };

        const imageModule = new ImageModule(imageOptions);

        const doc = new Docxtemplater(zip, {
            modules: [imageModule],
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.render({
            ...templateData,
            chu_ky_nguoi_thue: 'signature',
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs.writeFileSync(docxFilePath, buf);
    } catch (docxErr) {
        console.error('[DOCX_GENERATION_ERROR]', docxErr);
    }

    // 3. Render file PDF (.pdf) chuẩn pháp lý bằng PDFKit
    const pdfFileName = `hop-dong-${contract._id}.pdf`;
    const pdfFilePath = path.join(contractsDir, pdfFileName);
    await generatePdfFile(pdfFilePath, templateData, signatureBuffer);

    // 4. Lưu URL vào Contract Document
    contract.docxUrl = `/public/contracts/${docxFileName}`;
    contract.pdfUrl = `/public/contracts/${pdfFileName}`;
    if (signatureBase64) {
        contract.tenantSignature = signatureBase64;
    }
    contract.signedAt = new Date();
    await contract.save();

    return {
        docxUrl: contract.docxUrl,
        pdfUrl: contract.pdfUrl,
        docxFilePath,
        pdfFilePath,
    };
}

/**
 * Generate standard Vietnamese legal contract in PDF
 */
function generatePdfFile(outputPath, data, signatureBuffer) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 55, right: 55 },
        });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Header Quốc hiệu Tiêu ngữ
        doc.fontSize(13).font('Helvetica-Bold').text('CONG HOA XA HOI CHU NGHIA VIET NAM', { align: 'center' });
        doc.fontSize(11).font('Helvetica').text('Doc lap - Tu do - Hanh phuc', { align: 'center' });
        doc.fontSize(10).text('-----------------------', { align: 'center' });
        doc.moveDown(1.2);

        // Tiêu đề Hợp đồng
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1A365D').text('HOP DONG THUE PHONG TRO / NHA TRO', { align: 'center' });
        doc.moveDown(0.8);

        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text('Hom nay, cac ben dong y ky ket hop dong dien tu tren nen tang TroHub voi cac thong tin sau:');
        doc.moveDown(0.6);

        // Bên A
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F766E').text('BEN CHO THUE (BEN A):');
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(`- Ho va ten: ${data.ten_chu_tro}`);
        doc.text(`- So CCCD/CMND: ${data.cccd_chu_tro}`);
        doc.text(`- So dien thoai: ${data.sdt_chu_tro}`);
        doc.text(`- Dia chi nha tro: ${data.dia_chi_nha_tro}`);
        doc.moveDown(0.6);

        // Bên B
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F766E').text('BEN THUE PHONG (BEN B):');
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        doc.text(`- Ho va ten: ${data.ten_nguoi_thue}`);
        doc.text(`- So CCCD/CMND: ${data.cccd_nguoi_thue}`);
        doc.text(`- So dien thoai: ${data.sdt_nguoi_thue}`);
        doc.moveDown(0.8);

        // Điều 1
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('DIEU 1: DOI TUONG VA THOI HAN THUE');
        doc.fontSize(10).font('Helvetica');
        doc.text(`1.1. Ben A dong y cho Ben B thue phong so: ${data.ma_phong} tai dia chi: ${data.dia_chi_nha_tro}.`);
        doc.text(`1.2. Thoi han thue: Tu ngay ${data.ngay_bat_dau} den ngay ${data.ngay_ket_thuc}.`);
        doc.moveDown(0.6);

        // Điều 2
        doc.fontSize(11).font('Helvetica-Bold').text('DIEU 2: GIA THUE, TIEN COC VA DICH VU');
        doc.fontSize(10).font('Helvetica');
        doc.text(`2.1. Gia thue phong co dinh: ${data.gia_thue} VND/thang (Thanh toan dinh ky hang thang).`);
        doc.text(`2.2. Tien dat coc giu phong: ${data.tien_coc} VND (Hoan tra khi thanh ly hop dong).`);
        doc.text(`2.3. Don gia dien tieu thu: ${data.gia_dien} VND/kWh (Theo cong to thuc te).`);
        doc.text(`2.4. Don gia nuoc sinh hoat: ${data.gia_nuoc} VND/m3 (Theo dong ho thuc te).`);
        doc.text(`2.5. Chi phi dich vu co dinh: ${data.phi_dich_vu} VND/thang.`);
        doc.moveDown(0.6);

        // Điều 3
        doc.fontSize(11).font('Helvetica-Bold').text('DIEU 3: QUYEN VA NGHIA VU');
        doc.fontSize(10).font('Helvetica');
        doc.text('3.1. Ben B thanh toan day du hoa don tien phong va dien nuoc dung thoi han tren TroHub.');
        doc.text('3.2. Giu gin an ninh trat tu, phong chay chua chay, khong lam hu hong tai san.');
        doc.text('3.3. Ben A ban giao phong day du tien nghi, ho tro giai quyet su co kip thoi.');
        doc.moveDown(1);

        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555').text('Hop dong dien tu co gia tri phap ly tuong duong van ban giay ke tu luc Ben B ky xac nhan.', { align: 'center' });
        doc.moveDown(1.2);

        // Chữ ký 2 bên
        const yStart = doc.y;
        const colWidth = 220;

        // Cột bên A
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('DAI DIEN BEN CHO THUE (BEN A)', 60, yStart, { width: colWidth, align: 'center' });
        doc.fontSize(9).font('Helvetica-Oblique').text('(Ky, ghi ro ho ten)', 60, yStart + 16, { width: colWidth, align: 'center' });
        doc.fontSize(10).font('Helvetica-Bold').text(data.ten_chu_tro, 60, yStart + 85, { width: colWidth, align: 'center' });

        // Cột bên B
        doc.fontSize(10).font('Helvetica-Bold').text('DAI DIEN BEN THUE (BEN B)', 310, yStart, { width: colWidth, align: 'center' });
        doc.fontSize(9).font('Helvetica-Oblique').text('(Da ky dien tu)', 310, yStart + 16, { width: colWidth, align: 'center' });

        if (signatureBuffer) {
            try {
                doc.image(signatureBuffer, 355, yStart + 35, { fit: [130, 45], align: 'center' });
            } catch (imgErr) {
                console.log('[PDF Signature embed error]', imgErr.message);
            }
        }

        doc.fontSize(10).font('Helvetica-Bold').text(data.ten_nguoi_thue, 310, yStart + 85, { width: colWidth, align: 'center' });

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
    });
}

module.exports = {
    generateContractDocuments,
};
=======
    if (!contract) throw new Error('Không tìm thấy hợp đồng để tạo tài liệu.');
    const room = contract.roomId;
    if (!room?.landlordId) throw new Error('Hợp đồng chưa liên kết chủ trọ của phòng.');
    const landlord = await Account.findById(room.landlordId);
    if (!landlord) throw new Error('Không tìm thấy chủ trọ được liên kết với phòng.');
    const tenant = contract.tenantId;
    if (!tenant) throw new Error('Không tìm thấy người thuê của hợp đồng.');
    const fixedServicesTotal = (contract.services || []).reduce((sum, service) => sum + (Number(service.fixedPrice) || 0), 0);
    const data = {
        ten_chu_tro: landlord.fullName || '',
        cccd_chu_tro: landlord.idCard || '',
        sdt_chu_tro: landlord.phone || '',
        dia_chi_nha_tro: landlord.propertyAddress || '',
        ten_nguoi_thue: tenant.fullName || '',
        cccd_nguoi_thue: tenant.idCard || '',
        sdt_nguoi_thue: tenant.phone || '',
        ma_phong: room.roomCode || '',
        gia_thue: formatVND(contract.fixedRentPrice),
        tien_coc: formatVND(contract.fixedDeposit),
        tien_coc_bang_chu: numberToVietnameseWords(contract.fixedDeposit),
        ngay_bat_dau: formatDate(contract.startDate),
        ngay_ket_thuc: formatDate(contract.endDate),
        gia_dien: contract.electricityPrice == null ? '' : formatVND(contract.electricityPrice),
        gia_nuoc: contract.waterPrice == null ? '' : formatVND(contract.waterPrice),
        phi_dich_vu: formatVND(fixedServicesTotal),
    };
    return { contract, data, signatureBuffer: cleanBase64(signatureBase64 || contract.tenantSignature) };
}

async function generateContractDocuments(contractId, signatureBase64, options = {}) {
    const { includeDocx: wantsDocx = false, includePdf = true } = options;
    const contractsDir = path.join(__dirname, '../../storage/contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    const templatePath = path.join(__dirname, '../../templates/hop-dong-thue-nha-tro.docx');
    if (!fs.existsSync(templatePath)) await require('../../scripts/generateTemplateDocx').createContractTemplate();
    const { contract, data, signatureBuffer } = await loadContractData(contractId, signatureBase64);
    const includeDocx = wantsDocx && !signatureBase64 && contract.status === 0;
    const docxFilePath = path.join(contractsDir, `hop-dong-${contract._id}.docx`);
    const pdfFilePath = path.join(contractsDir, `hop-dong-${contract._id}.pdf`);

    if (includeDocx) {
        try {
            const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
            const imageModule = new ImageModule({ centered: true, getImage: () => signatureBuffer || Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'), getSize: () => [160, 70] });
            const doc = new Docxtemplater(zip, { modules: [imageModule], paragraphLoop: true, linebreaks: true });
            doc.render({ ...data, chu_ky_nguoi_thue: 'signature' });
            fs.writeFileSync(docxFilePath, doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
        } catch (error) {
            console.error('[DOCX_GENERATION_ERROR]', error);
        }
    }
    if (includePdf) {
        await generatePdfFile(pdfFilePath, data, signatureBuffer);
        contract.pdfVersion = PDF_DOCUMENT_VERSION;
        contract.pdfUrl = `/api/contracts/${contract._id}/pdf`;
    }
    if (signatureBase64) {
        contract.tenantSignature = signatureBase64;
        contract.signedAt = new Date();
    }
    if (includePdf && (signatureBase64 || contract.status >= 1)) {
        fs.rmSync(docxFilePath, { force: true });
    }
    if (includeDocx) contract.docxUrl = undefined;
    await contract.save();
    return { docxUrl: undefined, pdfUrl: includePdf ? contract.pdfUrl : undefined, docxFilePath: includeDocx ? docxFilePath : undefined, pdfFilePath: includePdf ? pdfFilePath : undefined };
}

async function generateContractPdf(contractIdOrOptions, signatureBase64) {
    if (contractIdOrOptions && typeof contractIdOrOptions === 'object' && contractIdOrOptions.outputPath) {
        return generatePdfFile(contractIdOrOptions.outputPath, contractIdOrOptions.data, contractIdOrOptions.signatureBuffer);
    }
    return generateContractDocuments(contractIdOrOptions, signatureBase64, { includeDocx: false, includePdf: true });
}

function generateContractDocx(contractId, signatureBase64) {
    return generateContractDocuments(contractId, signatureBase64, { includeDocx: true, includePdf: false });
}

function generatePdfFile(outputPath, data, signatureBuffer) {
    return new Promise((resolve, reject) => {
        const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
        const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 55, right: 55 } });
        try {
            doc.registerFont('Roboto', fontPaths.regular);
            doc.registerFont('Roboto-Bold', fontPaths.bold);
            doc.registerFont('Roboto-Italic', fontPaths.italic);
        } catch (error) { reject(error); return; }
        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);
        doc.font('Roboto-Bold').fontSize(13).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
        doc.font('Roboto').fontSize(11).text('Độc lập - Tự do - Hạnh phúc', { align: 'center' });
        doc.fontSize(10).text('-----------------------', { align: 'center' }).moveDown(1.2);
        doc.font('Roboto-Bold').fontSize(16).fillColor('#1A365D').text('HỢP ĐỒNG THUÊ PHÒNG TRỌ / NHÀ TRỌ', { align: 'center' }).moveDown(0.8);
        doc.font('Roboto').fontSize(10).fillColor('#000000').text('Hôm nay, các bên đồng ý ký kết hợp đồng điện tử trên nền tảng TroHub với các thông tin sau:').moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).fillColor('#0F766E').text('BÊN CHO THUÊ (BÊN A):');
        doc.font('Roboto').fontSize(10).fillColor('#000000').text(`- Họ và tên: ${data.ten_chu_tro}`).text(`- Số CCCD/CMND: ${data.cccd_chu_tro}`).text(`- Số điện thoại: ${data.sdt_chu_tro}`).text(`- Địa chỉ nhà trọ: ${data.dia_chi_nha_tro}`).moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).fillColor('#0F766E').text('BÊN THUÊ PHÒNG (BÊN B):');
        doc.font('Roboto').fontSize(10).fillColor('#000000').text(`- Họ và tên: ${data.ten_nguoi_thue}`).text(`- Số CCCD/CMND: ${data.cccd_nguoi_thue}`).text(`- Số điện thoại: ${data.sdt_nguoi_thue}`).moveDown(0.8);
        doc.font('Roboto-Bold').fontSize(11).text('ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ');
        doc.font('Roboto').fontSize(10).text(`1.1. Bên A đồng ý cho Bên B thuê phòng số: ${data.ma_phong} tại địa chỉ: ${data.dia_chi_nha_tro}.`).text(`1.2. Thời hạn thuê: Từ ngày ${data.ngay_bat_dau} đến ngày ${data.ngay_ket_thuc}.`).moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).text('ĐIỀU 2: GIÁ THUÊ, TIỀN CỌC VÀ DỊCH VỤ');
        doc.font('Roboto').fontSize(10).text(`2.1. Giá thuê phòng cố định: ${data.gia_thue} VNĐ/tháng (Thanh toán định kỳ hàng tháng).`).text(`2.2. Tiền đặt cọc giữ phòng: ${data.tien_coc} VNĐ (${data.tien_coc_bang_chu || ''}).`).text(`2.3. Đơn giá điện tiêu thụ: ${data.gia_dien} VNĐ/kWh (Theo công tơ thực tế).`).text(`2.4. Đơn giá nước sinh hoạt: ${data.gia_nuoc} VNĐ/m³ (Theo đồng hồ thực tế).`).text(`2.5. Chi phí dịch vụ cố định: ${data.phi_dich_vu} VNĐ/tháng.`).moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).text('ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ');
        doc.font('Roboto').fontSize(10).text('3.1. Bên B thanh toán đầy đủ hóa đơn tiền phòng và điện nước đúng thời hạn trên TroHub.').text('3.2. Giữ gìn an ninh trật tự, phòng cháy chữa cháy, không làm hư hỏng tài sản.').text('3.3. Bên A bàn giao phòng đầy đủ tiện nghi, hỗ trợ giải quyết sự cố kịp thời.').moveDown(1);
        doc.font('Roboto-Italic').fontSize(9).fillColor('#555555').text('Hợp đồng điện tử có giá trị pháp lý tương đương văn bản giấy kể từ lúc Bên B ký xác nhận.', { align: 'center' }).moveDown(1.2);
        const yStart = doc.y; const colWidth = 220;
        doc.font('Roboto-Bold').fontSize(10).fillColor('#000000').text('ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)', 60, yStart, { width: colWidth, align: 'center' });
        doc.font('Roboto-Italic').fontSize(9).text('(Ký, ghi rõ họ tên)', 60, yStart + 16, { width: colWidth, align: 'center' });
        doc.font('Roboto-Bold').fontSize(10).text(data.ten_chu_tro, 60, yStart + 85, { width: colWidth, align: 'center' });
        doc.font('Roboto-Bold').fontSize(10).text('ĐẠI DIỆN BÊN THUÊ (BÊN B)', 310, yStart, { width: colWidth, align: 'center' });
        doc.font('Roboto-Italic').fontSize(9).text('(Đã ký điện tử)', 310, yStart + 16, { width: colWidth, align: 'center' });
        if (signatureBuffer) { try { doc.image(signatureBuffer, 355, yStart + 35, { fit: [130, 45], align: 'center' }); } catch (error) { console.error('[PDF_SIGNATURE]', error.message); } }
        doc.font('Roboto-Bold').fontSize(10).text(data.ten_nguoi_thue, 310, yStart + 85, { width: colWidth, align: 'center' });
        doc.end();
        stream.on('finish', () => { try { fs.renameSync(tempPath, outputPath); resolve(); } catch (error) { reject(error); } });
        stream.on('error', (error) => { fs.rmSync(tempPath, { force: true }); reject(error); });
    });
}

module.exports = { generateContractDocuments, generateContractPdf, generateContractDocx, generatePdfFile, PDF_DOCUMENT_VERSION, fontPaths };
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
