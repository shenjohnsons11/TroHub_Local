const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const PDFDocument = require('pdfkit');
const Contract = require('../models/Contract');
const Account = require('../models/Account');
const Room = require('../models/Room');

function formatVND(amount) {
    if (!amount && amount !== 0) return '0';
    return Number(amount).toLocaleString('vi-VN');
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function cleanBase64(dataUrl) {
    if (!dataUrl) return null;
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

    const contract = await Contract.findById(contractId)
        .populate('roomId')
        .populate('tenantId')
        .populate('services.serviceId');

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
