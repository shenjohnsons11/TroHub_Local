const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const PDFDocument = require('pdfkit');
const Contract = require('../models/Contract');
const Account = require('../models/Account');
const { numberToVietnameseWords } = require('./vietnameseNumber');

const PDF_DOCUMENT_VERSION = 1;
const fontPaths = {
    regular: path.join(__dirname, '../../assets/fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../assets/fonts/Roboto-Bold.ttf'),
    italic: path.join(__dirname, '../../assets/fonts/Roboto-Italic.ttf'),
};

function formatVND(amount) {
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '';
    return Number(amount).toLocaleString('vi-VN');
}

function formatDate(date) {
    if (!date) return '';
    const value = new Date(date);
    return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
}

function cleanBase64(dataUrl) {
    if (!dataUrl) return null;
    const base64 = String(dataUrl).replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();
    return Buffer.from(base64, 'base64');
}

async function loadContractData(contractId, signatureBase64) {
    const contract = await Contract.findById(contractId)
        .populate('roomId')
        .populate('tenantId')
        .populate('services.serviceId');
    if (!contract) throw new Error('Không tìm thấy hợp đồng để tạo tài liệu.');
    const room = contract.roomId;
    if (!room?.landlordId) throw new Error('Hợp đồng chưa liên kết chủ trọ của phòng.');
    const landlord = await Account.findById(room.landlordId);
    if (!landlord) throw new Error('Không tìm thấy chủ trọ được liên kết với phòng.');
    const tenant = contract.tenantId;
    if (!tenant) throw new Error('Không tìm thấy người thuê của hợp đồng.');
    const fixedServicesTotal = (contract.services || []).reduce((sum, service) => sum + (Number(service.fixedPrice) || 0), 0);
    const propertyAddress = contract.propertyAddress || landlord.propertyAddress || '';
    const data = {
        ten_chu_tro: landlord.fullName || '',
        cccd_chu_tro: landlord.idCard || '',
        sdt_chu_tro: landlord.phone || '',
        dia_chi_nha_tro: propertyAddress,
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
    return {
        contract,
        data,
        signatureBuffer: cleanBase64(signatureBase64 || contract.tenantSignature),
        landlordSignatureBuffer: cleanBase64(contract.landlordSignature || landlord.landlordSignature),
        landlordSignatureBase64: contract.landlordSignature || landlord.landlordSignature || '',
        tenantSignatureBase64: signatureBase64 || contract.tenantSignature || ''
    };
}

async function generateContractDocuments(contractId, signatureBase64, options = {}) {
    const { includeDocx: wantsDocx = false, includePdf = true } = options;
    const contractsDir = path.join(__dirname, '../../storage/contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    const templatePath = path.join(__dirname, '../../templates/hop-dong-thue-nha-tro.docx');
    if (!fs.existsSync(templatePath)) await require('../../scripts/generateTemplateDocx').createContractTemplate();
    const { contract, data, signatureBuffer, landlordSignatureBuffer } = await loadContractData(contractId, signatureBase64);
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
        await generatePdfFile(pdfFilePath, data, signatureBuffer, landlordSignatureBuffer);
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
        return generatePdfFile(contractIdOrOptions.outputPath, contractIdOrOptions.data, contractIdOrOptions.signatureBuffer, contractIdOrOptions.landlordSignatureBuffer);
    }
    return generateContractDocuments(contractIdOrOptions, signatureBase64, { includeDocx: false, includePdf: true });
}

function generateContractDocx(contractId, signatureBase64) {
    return generateContractDocuments(contractId, signatureBase64, { includeDocx: true, includePdf: false });
}

function generatePdfFile(outputPath, data, signatureBuffer, landlordSignatureBuffer) {
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
        doc.font('Roboto').fontSize(10).fillColor('#000000').text(`- Họ và tên: ${data.ten_chu_tro}`).text(`- Số CCCD/CMND: ${data.cccd_chu_tro}`).text(`- Số điện thoại: ${data.sdt_chu_tro}`).text(`- Địa chỉ nhà trọ: ${data.dia_chi_nha_tro || 'Tại địa chỉ phòng trọ'}`).moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).fillColor('#0F766E').text('BÊN THUÊ PHÒNG (BÊN B):');
        doc.font('Roboto').fontSize(10).fillColor('#000000').text(`- Họ và tên: ${data.ten_nguoi_thue}`).text(`- Số CCCD/CMND: ${data.cccd_nguoi_thue}`).text(`- Số điện thoại: ${data.sdt_nguoi_thue}`).moveDown(0.8);
        doc.font('Roboto-Bold').fontSize(11).text('ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ');
        doc.font('Roboto').fontSize(10).text(`1.1. Bên A đồng ý cho Bên B thuê phòng số: ${data.ma_phong} tại địa chỉ: ${data.dia_chi_nha_tro || 'Địa chỉ đăng ký của cơ sở'}.`).text(`1.2. Thời hạn thuê: Từ ngày ${data.ngay_bat_dau} đến ngày ${data.ngay_ket_thuc}.`).moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).text('ĐIỀU 2: GIÁ THUÊ, TIỀN CỌC VÀ DỊCH VỤ');
        doc.font('Roboto').fontSize(10).text(`2.1. Giá thuê phòng cố định: ${data.gia_thue} VNĐ/tháng (Thanh toán định kỳ hàng tháng).`).text(`2.2. Tiền đặt cọc giữ phòng: ${data.tien_coc} VNĐ (${data.tien_coc_bang_chu || ''}).`).text(`2.3. Đơn giá điện tiêu thụ: ${data.gia_dien} VNĐ/kWh (Theo công tơ thực tế).`).text(`2.4. Đơn giá nước sinh hoạt: ${data.gia_nuoc} VNĐ/m³ (Theo đồng hồ thực tế).`).text(`2.5. Chi phí dịch vụ cố định: ${data.phi_dich_vu} VNĐ/tháng.`).moveDown(0.6);
        doc.font('Roboto-Bold').fontSize(11).text('ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ');
        doc.font('Roboto').fontSize(10).text('3.1. Bên B thanh toán đầy đủ hóa đơn tiền phòng và điện nước đúng thời hạn trên TroHub.').text('3.2. Giữ gìn an ninh trật tự, phòng cháy chữa cháy, không làm hư hỏng tài sản.').text('3.3. Bên A bàn giao phòng đầy đủ tiện nghi, hỗ trợ giải quyết sự cố kịp thời.').moveDown(1);
        doc.font('Roboto-Italic').fontSize(9).fillColor('#555555').text('Hợp đồng điện tử có giá trị pháp lý tương đương văn bản giấy kể từ lúc Bên B ký xác nhận.', { align: 'center' }).moveDown(1.2);
        const yStart = doc.y; const colWidth = 220;
        doc.font('Roboto-Bold').fontSize(10).fillColor('#000000').text('ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)', 60, yStart, { width: colWidth, align: 'center' });
        doc.font('Roboto-Italic').fontSize(9).text('(Ký, ghi rõ họ tên)', 60, yStart + 16, { width: colWidth, align: 'center' });
        if (landlordSignatureBuffer) {
            try { doc.image(landlordSignatureBuffer, 105, yStart + 35, { fit: [130, 45], align: 'center' }); }
            catch (error) { console.error('[PDF_LANDLORD_SIGNATURE]', error.message); }
        }
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

function renderContractHtml(data, landlordSignature, tenantSignature) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hợp đồng điện tử</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; line-height: 1.6; }
    .page { background: #ffffff; max-width: 720px; margin: 0 auto; padding: 40px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { text-align: center; margin-bottom: 24px; }
    .header h3 { font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 0; }
    .header h4 { font-size: 13px; font-weight: 600; margin: 4px 0 0 0; }
    .divider { width: 120px; height: 1px; background: #cbd5e1; margin: 8px auto 16px auto; }
    .title { font-size: 18px; font-weight: 900; color: #1e3a8a; text-align: center; text-transform: uppercase; margin-bottom: 12px; }
    .subtitle { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px; font-style: italic; }
    .section-header { font-size: 13px; font-weight: 800; color: #0d9488; text-transform: uppercase; margin: 16px 0 6px 0; }
    .info-list { font-size: 13px; margin: 0 0 12px 0; padding-left: 0; list-style: none; }
    .info-list li { margin-bottom: 4px; }
    .article-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 16px 0 6px 0; }
    .article-body { font-size: 13px; margin: 0 0 8px 0; }
    .note { text-align: center; font-size: 11px; font-style: italic; color: #64748b; margin: 28px 0 20px 0; }
    .signatures { display: flex; justify-content: space-between; margin-top: 24px; }
    .sign-col { width: 48%; text-align: center; }
    .sign-title { font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .sign-sub { font-size: 11px; font-style: italic; color: #64748b; margin-top: 2px; }
    .sign-box { height: 75px; display: flex; align-items: center; justify-content: center; margin: 8px 0; }
    .sign-img { max-height: 65px; max-width: 140px; object-fit: contain; }
    .sign-name { font-size: 13px; font-weight: 800; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
      <h4>Độc lập - Tự do - Hạnh phúc</h4>
      <div class="divider"></div>
    </div>
    <div class="title">HỢP ĐỒNG THUÊ PHÒNG TRỌ / NHÀ TRỌ</div>
    <div class="subtitle">Hôm nay, các bên đồng ý ký kết hợp đồng điện tử trên nền tảng TroHub với các thông tin sau:</div>

    <div class="section-header">BÊN CHO THUÊ (BÊN A):</div>
    <ul class="info-list">
      <li><strong>- Họ và tên:</strong> ${data.ten_chu_tro || ''}</li>
      <li><strong>- Số CCCD/CMND:</strong> ${data.cccd_chu_tro || ''}</li>
      <li><strong>- Số điện thoại:</strong> ${data.sdt_chu_tro || ''}</li>
      <li><strong>- Địa chỉ nhà trọ:</strong> ${data.dia_chi_nha_tro || 'Theo địa chỉ cơ sở'}</li>
    </ul>

    <div class="section-header">BÊN THUÊ PHÒNG (BÊN B):</div>
    <ul class="info-list">
      <li><strong>- Họ và tên:</strong> ${data.ten_nguoi_thue || ''}</li>
      <li><strong>- Số CCCD/CMND:</strong> ${data.cccd_nguoi_thue || ''}</li>
      <li><strong>- Số điện thoại:</strong> ${data.sdt_nguoi_thue || ''}</li>
    </ul>

    <div class="article-title">ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ</div>
    <div class="article-body">1.1. Bên A đồng ý cho Bên B thuê phòng số: <strong>${data.ma_phong || ''}</strong> tại địa chỉ: ${data.dia_chi_nha_tro || 'Cơ sở quản lý'}.</div>
    <div class="article-body">1.2. Thời hạn thuê: Từ ngày <strong>${data.ngay_bat_dau || ''}</strong> đến ngày <strong>${data.ngay_ket_thuc || ''}</strong>.</div>

    <div class="article-title">ĐIỀU 2: GIÁ THUÊ, TIỀN CỌC VÀ DỊCH VỤ</div>
    <div class="article-body">2.1. Giá thuê phòng cố định: <strong>${data.gia_thue || '0'} VNĐ/tháng</strong> (Thanh toán định kỳ hàng tháng).</div>
    <div class="article-body">2.2. Tiền đặt cọc giữ phòng: <strong>${data.tien_coc || '0'} VNĐ</strong> ${data.tien_coc_bang_chu ? `(${data.tien_coc_bang_chu})` : ''}.</div>
    <div class="article-body">2.3. Đơn giá điện tiêu thụ: <strong>${data.gia_dien || '0'} VNĐ/kWh</strong> (Theo chỉ số công tơ thực tế).</div>
    <div class="article-body">2.4. Đơn giá nước sinh hoạt: <strong>${data.gia_nuoc || '0'} VNĐ/m³</strong> (Theo chỉ số đồng hồ thực tế).</div>
    <div class="article-body">2.5. Chi phí dịch vụ cố định: <strong>${data.phi_dich_vu || '0'} VNĐ/tháng</strong>.</div>

    <div class="article-title">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ</div>
    <div class="article-body">3.1. Bên B thanh toán đầy đủ hóa đơn tiền phòng và điện nước đúng thời hạn quy định trên hệ thống TroHub.</div>
    <div class="article-body">3.2. Giữ gìn an ninh trật tự, phòng cháy chữa cháy, vệ sinh chung và không làm hư hại tài sản.</div>
    <div class="article-body">3.3. Bên A bàn giao phòng đầy đủ tiện nghi, hỗ trợ giải quyết sự cố kỹ thuật kịp thời.</div>

    <div class="note">Hợp đồng điện tử có giá trị pháp lý tương đương văn bản giấy kể từ lúc hai bên xác nhận.</div>

    <div class="signatures">
      <div class="sign-col">
        <div class="sign-title">ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)</div>
        <div class="sign-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sign-box">
          ${landlordSignature ? `<img src="${landlordSignature.startsWith('data:') ? landlordSignature : 'data:image/png;base64,' + landlordSignature}" class="sign-img" alt="Chữ ký bên A" />` : ''}
        </div>
        <div class="sign-name">${data.ten_chu_tro || ''}</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">ĐẠI DIỆN BÊN THUÊ (BÊN B)</div>
        <div class="sign-sub">(Đã ký điện tử)</div>
        <div class="sign-box">
          ${tenantSignature ? `<img src="${tenantSignature.startsWith('data:') ? tenantSignature : 'data:image/png;base64,' + tenantSignature}" class="sign-img" alt="Chữ ký bên B" />` : ''}
        </div>
        <div class="sign-name">${data.ten_nguoi_thue || ''}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { generateContractDocuments, generateContractPdf, generateContractDocx, generatePdfFile, renderContractHtml, loadContractData, PDF_DOCUMENT_VERSION, fontPaths };

