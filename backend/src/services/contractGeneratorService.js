const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const PDFDocument = require('pdfkit');
const Contract = require('../models/Contract');
const Account = require('../models/Account');
const { numberToVietnameseWords } = require('./vietnameseNumber');

const PDF_DOCUMENT_VERSION = 2;
const fontPaths = {
    regular: path.join(__dirname, '../../assets/fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../../assets/fonts/Roboto-Bold.ttf'),
    italic: path.join(__dirname, '../../assets/fonts/Roboto-Italic.ttf'),
};

function formatVND(amount) {
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '0';
    return Number(amount).toLocaleString('vi-VN');
}

function formatDate(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
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
    const propertyAddress = contract.propertyAddress || landlord.propertyAddress || room.propertyAddress || 'Cơ sở nhà trọ TroHub';

    // Calculate dates
    const signDate = contract.signedAt || contract.startDate || contract.createdAt || new Date();
    const d = new Date(signDate);
    const ngay_ky = String(d.getDate()).padStart(2, '0');
    const thang_ky = String(d.getMonth() + 1).padStart(2, '0');
    const nam_ky = String(d.getFullYear());

    let thoi_han_thang = 12;
    if (contract.startDate && contract.endDate) {
        const start = new Date(contract.startDate);
        const end = new Date(contract.endDate);
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        thoi_han_thang = Math.max(1, diffMonths);
    }

    let gia_thue_bang_chu = '';
    try {
        if (contract.fixedRentPrice != null) {
            gia_thue_bang_chu = numberToVietnameseWords(Math.round(contract.fixedRentPrice));
        }
    } catch {
        gia_thue_bang_chu = '';
    }

    let tien_coc_bang_chu = '';
    try {
        if (contract.fixedDeposit != null) {
            tien_coc_bang_chu = numberToVietnameseWords(Math.round(contract.fixedDeposit));
        }
    } catch {
        tien_coc_bang_chu = '';
    }

    const contractShortId = contract._id ? contract._id.toString().slice(-6).toUpperCase() : '000000';
    const so_hop_dong = `HD-${room.roomCode || 'P'}/${contractShortId}`;

    const data = {
        so_hop_dong,
        ngay_ky,
        thang_ky,
        nam_ky,
        // Bên cho thuê (Bên A)
        ten_chu_tro: landlord.fullName || '.....................................................',
        cccd_chu_tro: landlord.idCard || '........................',
        sdt_chu_tro: landlord.phone || '........................',
        email_chu_tro: landlord.email || '',
        dia_chi_chu_tro: landlord.propertyAddress || propertyAddress,
        stk_chu_tro: landlord.bankAccountNo || '........................',
        ngan_hang_chu_tro: landlord.bankId || '........................',
        ten_tai_khoan_chu_tro: landlord.bankAccountName || landlord.fullName || '',
        // Bên thuê (Bên B)
        ten_nguoi_thue: tenant.fullName || '.....................................................',
        cccd_nguoi_thue: tenant.idCard || '........................',
        sdt_nguoi_thue: tenant.phone || '........................',
        email_nguoi_thue: tenant.email || '',
        dia_chi_nguoi_thue: tenant.propertyAddress || 'Theo đăng ký thường trú/CCCD',
        // Thông tin nhà ở / phòng thuê
        ma_phong: room.roomCode || '................',
        tang_phong: room.floor != null ? String(room.floor) : '1',
        dien_tich_phong: room.area || '20',
        dia_chi_nha_tro: propertyAddress,
        chi_so_dien_ban_dau: String(contract.initialElectricity != null ? contract.initialElectricity : (room.lastElectricityReading != null ? room.lastElectricityReading : 0)),
        chi_so_nuoc_ban_dau: String(contract.initialWater != null ? contract.initialWater : (room.lastWaterReading != null ? room.lastWaterReading : 0)),
        // Giá & điều khoản tài chính
        gia_thue: formatVND(contract.fixedRentPrice),
        gia_thue_bang_chu: gia_thue_bang_chu || '.....................................................',
        tien_coc: formatVND(contract.fixedDeposit),
        tien_coc_bang_chu: tien_coc_bang_chu || '.....................................................',
        ngay_bat_dau: formatDate(contract.startDate),
        ngay_ket_thuc: formatDate(contract.endDate),
        thoi_han_thang: String(thoi_han_thang),
        ngay_giao_phong: formatDate(contract.handoverDate || contract.startDate),
        gia_dien: contract.electricityPrice == null ? '0' : formatVND(contract.electricityPrice),
        gia_nuoc: contract.waterPrice == null ? '0' : formatVND(contract.waterPrice),
        phi_dich_vu: formatVND(fixedServicesTotal),
        ngay_thanh_toan_hang_thang: 'từ ngày 01 đến ngày 05',
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
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 40, bottom: 40, left: 50, right: 50 },
            bufferPages: true
        });

        try {
            doc.registerFont('Roboto', fontPaths.regular);
            doc.registerFont('Roboto-Bold', fontPaths.bold);
            doc.registerFont('Roboto-Italic', fontPaths.italic);
        } catch (error) {
            reject(error);
            return;
        }

        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);

        // Header: Quốc hiệu - Tiêu ngữ
        doc.font('Roboto-Bold').fontSize(12).text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
        doc.font('Roboto').fontSize(10.5).text('Độc lập - Tự do - Hạnh phúc', { align: 'center' });
        doc.fontSize(10).text('-----------------------------------', { align: 'center' }).moveDown(0.5);

        // Ngày lập & Tiêu đề
        doc.font('Roboto-Italic').fontSize(9).text(`Hôm nay, ngày ${data.ngay_ky} tháng ${data.thang_ky} năm ${data.nam_ky}`, { align: 'right' }).moveDown(0.4);
        doc.font('Roboto-Bold').fontSize(15).fillColor('#1E3A8A').text('HỢP ĐỒNG THUÊ NHÀ Ở', { align: 'center' }).moveDown(0.2);
        doc.font('Roboto-Italic').fontSize(9.5).fillColor('#475569').text(`Số: ${data.so_hop_dong || '...'} / HĐTN`, { align: 'center' }).moveDown(0.6);

        // Căn cứ pháp lý
        doc.font('Roboto-Italic').fontSize(8.5).fillColor('#334155');
        doc.text('- Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;');
        doc.text('- Căn cứ Luật Nhà ở ngày 27 tháng 11 năm 2023;');
        doc.text('- Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023;');
        doc.text('- Căn cứ nhu cầu và khả năng thực tế của hai bên.');
        doc.moveDown(0.6);

        doc.font('Roboto').fontSize(9.5).fillColor('#000000').text('Hai bên chúng tôi thống nhất ký kết hợp đồng thuê nhà ở với các nội dung sau:').moveDown(0.4);

        // Helper to print labeled field with BOLD value
        const printField = (label, value) => {
            doc.font('Roboto').fillColor('#000000').text(`- ${label}: `, { continued: true });
            doc.font('Roboto-Bold').text(value || '........................');
        };

        // I. BÊN CHO THUÊ (BÊN A)
        doc.font('Roboto-Bold').fontSize(10.5).fillColor('#0D9488').text('I. BÊN CHO THUÊ NHÀ Ở (BÊN A):');
        doc.fontSize(9.5).fillColor('#000000');
        printField('Họ và tên', data.ten_chu_tro);
        printField('Số CCCD/CMND', data.cccd_chu_tro);
        printField('Điện thoại liên hệ', data.sdt_chu_tro);
        printField('Địa chỉ cư trú / Cơ sở', data.dia_chi_chu_tro);
        if (data.stk_chu_tro && data.stk_chu_tro !== '........................') {
            doc.font('Roboto').text('- Số tài khoản nhận tiền: ', { continued: true })
               .font('Roboto-Bold').text(data.stk_chu_tro, { continued: true })
               .font('Roboto').text(' tại Ngân hàng: ', { continued: true })
               .font('Roboto-Bold').text(data.ngan_hang_chu_tro, { continued: true })
               .font('Roboto').text(` (${data.ten_tai_khoan_chu_tro})`);
        }
        doc.moveDown(0.5);

        // II. BÊN THUÊ (BÊN B)
        doc.font('Roboto-Bold').fontSize(10.5).fillColor('#0D9488').text('II. BÊN THUÊ NHÀ Ở (BÊN B):');
        doc.fontSize(9.5).fillColor('#000000');
        printField('Họ và tên', data.ten_nguoi_thue);
        printField('Số CCCD/CMND', data.cccd_nguoi_thue);
        printField('Điện thoại liên hệ', data.sdt_nguoi_thue);
        printField('Nơi đăng ký cư trú / Địa chỉ', data.dia_chi_nguoi_thue);
        doc.moveDown(0.6);

        // ĐIỀU 1
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 1. Các thông tin về nhà ở cho thuê');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text('1.1. Loại nhà ở: Phòng trọ / Căn hộ mini khép kín trong khuôn viên nhà ở.');
        doc.text('1.2. Vị trí, địa điểm: Phòng số ', { continued: true })
           .font('Roboto-Bold').text(data.ma_phong, { continued: true })
           .font('Roboto').text(` (Tầng ${data.tang_phong}), tại địa chỉ: `, { continued: true })
           .font('Roboto-Bold').text(data.dia_chi_nha_tro, { continued: true })
           .font('Roboto').text('.');
        doc.text('1.3. Diện tích sử dụng: Khoảng ', { continued: true })
           .font('Roboto-Bold').text(`${data.dien_tich_phong} m²`, { continued: true })
           .font('Roboto').text('; Công năng sử dụng: Để ở sinh hoạt.');
        doc.text('1.4. Hiện trạng bàn giao: Phòng kiên cố, hệ thống điện nước, cửa khóa an toàn và trang thiết bị kèm theo hoạt động tốt.');
        doc.text('1.5. Chỉ số đồng hồ ban đầu khi bàn giao: Điện: ', { continued: true })
           .font('Roboto-Bold').text(`${data.chi_so_dien_ban_dau} kWh`, { continued: true })
           .font('Roboto').text('; Nước: ', { continued: true })
           .font('Roboto-Bold').text(`${data.chi_so_nuoc_ban_dau} m³`, { continued: true })
           .font('Roboto').text('.');
        doc.moveDown(0.5);

        // ĐIỀU 2
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 2. Giá thuê nhà ở, tiền cọc và chi phí dịch vụ');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text('2.1. Giá thuê phòng cố định: ', { continued: true })
           .font('Roboto-Bold').text(`${data.gia_thue} VNĐ/tháng`, { continued: true })
           .font('Roboto').text(' (Bằng chữ: ', { continued: true })
           .font('Roboto-Bold').text(data.gia_thue_bang_chu, { continued: true })
           .font('Roboto').text(').');
        doc.text('2.2. Tiền đặt cọc giữ phòng: ', { continued: true })
           .font('Roboto-Bold').text(`${data.tien_coc} VNĐ`, { continued: true })
           .font('Roboto').text(' (Bằng chữ: ', { continued: true })
           .font('Roboto-Bold').text(data.tien_coc_bang_chu, { continued: true })
           .font('Roboto').text('). Khoản cọc được Bên A hoàn trả lại cho Bên B khi kết thúc hợp đồng sau khi đã khấu trừ hết các nghĩa vụ tài chính chưa thanh toán (nếu có).');
        doc.text('2.3. Đơn giá điện tiêu thụ: ', { continued: true })
           .font('Roboto-Bold').text(`${data.gia_dien} VNĐ/kWh`, { continued: true })
           .font('Roboto').text(' (Tính theo chỉ số công tơ thực tế hàng tháng).');
        doc.text('2.4. Đơn giá nước sinh hoạt: ', { continued: true })
           .font('Roboto-Bold').text(`${data.gia_nuoc} VNĐ/m³`, { continued: true })
           .font('Roboto').text(' (Tính theo chỉ số đồng hồ thực tế hàng tháng).');
        doc.text('2.5. Chi phí dịch vụ cố định (rác, wifi, vệ sinh chung...): ', { continued: true })
           .font('Roboto-Bold').text(`${data.phi_dich_vu} VNĐ/tháng`, { continued: true })
           .font('Roboto').text('.');
        doc.moveDown(0.5);

        // ĐIỀU 3
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 3. Phương thức và thời hạn thanh toán');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text('3.1. Phương thức thanh toán: Chuyển khoản ngân hàng (qua số tài khoản của Bên A hoặc quét mã VietQR tự động trên ứng dụng TroHub) hoặc tiền mặt.');
        doc.text('3.2. Thời hạn thanh toán: Định kỳ hàng tháng ', { continued: true })
           .font('Roboto-Bold').text(data.ngay_thanh_toan_hang_thang, { continued: true })
           .font('Roboto').text(' sau khi Bên A phát hành hóa đơn trên TroHub.');
        doc.moveDown(0.5);

        // ĐIỀU 4
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 4. Thời hạn thuê, thời điểm bàn giao nhà ở');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text('4.1. Thời hạn thuê: ', { continued: true })
           .font('Roboto-Bold').text(`${data.thoi_han_thang} tháng`, { continued: true })
           .font('Roboto').text(', từ ngày ', { continued: true })
           .font('Roboto-Bold').text(data.ngay_bat_dau, { continued: true })
           .font('Roboto').text(' đến hết ngày ', { continued: true })
           .font('Roboto-Bold').text(data.ngay_ket_thuc, { continued: true })
           .font('Roboto').text('.');
        doc.text('4.2. Thời điểm bàn giao phòng: Ngày ', { continued: true })
           .font('Roboto-Bold').text(data.ngay_giao_phong || data.ngay_bat_dau, { continued: true })
           .font('Roboto').text('.');
        doc.text('4.3. Hồ sơ kèm theo: Biên bản bàn giao hiện trạng phòng, chỉ số điện nước và Nội quy phòng trọ.');
        doc.moveDown(0.5);

        // ĐIỀU 5
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 5. Sử dụng nhà ở thuê và bảo đảm an toàn');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`5.1. Bên B sử dụng nhà ở đúng mục đích để ở; chấp hành nghiêm chỉnh các quy định pháp luật về đăng ký tạm trú, an ninh trật tự và phòng cháy chữa cháy (PCCC).`);
        doc.text(`5.2. Nghiêm cấm tàng trữ chất cấm, vũ khí, chất cháy nổ và các hoạt động vi phạm pháp luật trong khuôn viên nhà trọ.`);
        doc.text(`5.3. Bên B có trách nhiệm giữ gìn vệ sinh chung, bảo quản tài sản và trang thiết bị được bàn giao.`);
        doc.moveDown(0.5);

        // ĐIỀU 6 & 7
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 6. Quyền và nghĩa vụ của Bên cho thuê');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`6.1. Bàn giao phòng và trang thiết bị cho Bên B đúng thời hạn đã thỏa thuận.`);
        doc.text(`6.2. Bảo đảm quyền sử dụng ổn định, riêng tư cho Bên B trong suốt thời hạn hợp đồng.`);
        doc.text(`6.3. Kịp thời tiếp nhận và xử lý các sự cố kỹ thuật hạ tầng (điện, nước, internet) khi Bên B gửi yêu cầu hỗ trợ.`);
        doc.text(`6.4. Thu đúng, đủ các khoản tiền thuê và dịch vụ theo thỏa thuận.`);
        doc.moveDown(0.5);

        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 7. Quyền và nghĩa vụ của Bên thuê');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`7.1. Nhận bàn giao phòng và sử dụng đúng công năng, diện tích đã thỏa thuận.`);
        doc.text(`7.2. Thanh toán tiền phòng và chi phí điện nước, dịch vụ đúng hạn.`);
        doc.text(`7.3. Tự bảo quản tài sản cá nhân; không tự ý đục phá, sửa chữa, thay đổi kết cấu phòng khi chưa có sự đồng ý bằng văn bản của Bên A.`);
        doc.text(`7.4. Bồi thường thiệt hại thực tế nếu làm hư hỏng, mất mát tài sản của Bên A.`);
        doc.moveDown(0.5);

        // ĐIỀU 8, 9, 10, 11, 12
        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 8. Trách nhiệm do vi phạm hợp đồng và Bất khả kháng');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`Bên nào vi phạm nghĩa vụ hợp đồng gây thiệt hại cho bên kia thì phải chịu trách nhiệm bồi thường theo quy định pháp luật, trừ trường hợp xảy ra sự kiện bất khả kháng (thiên tai, dịch bệnh, hỏa hoạn không do lỗi các bên) theo quy định của Bộ luật Dân sự.`);
        doc.moveDown(0.5);

        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 9. Phạt vi phạm hợp đồng');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`Nếu Bên B tự ý chấm dứt hợp đồng trước thời hạn mà không thông báo trước tối thiểu 30 ngày hoặc vi phạm nghiêm trọng nội quy thì sẽ không được hoàn trả khoản tiền đặt cọc giữ phòng.`);
        doc.moveDown(0.5);

        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 10. Chấm dứt hợp đồng và thanh lý');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`Hợp đồng chấm dứt khi: Hết thời hạn thuê; hai bên thỏa thuận chấm dứt; hoặc một bên đơn phương chấm dứt hợp pháp. Khi chấm dứt, hai bên cùng chốt chỉ số điện nước cuối kỳ, bàn giao lại phòng và hoàn tất thanh toán/hoàn trả tiền cọc.`);
        doc.moveDown(0.5);

        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 11. Giải quyết tranh chấp');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text(`Mọi tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng hòa giải. Trường hợp không thể tự thương lượng, tranh chấp sẽ được yêu cầu Tòa án nhân dân có thẩm quyền tại địa phương nơi có bất động sản giải quyết.`);
        doc.moveDown(0.5);

        doc.font('Roboto-Bold').fontSize(10).fillColor('#0F172A').text('Điều 12. Hiệu lực của hợp đồng');
        doc.font('Roboto').fontSize(9).fillColor('#000000');
        doc.text('12.1. Hợp đồng này có hiệu lực kể từ ngày ', { continued: true })
           .font('Roboto-Bold').text(data.ngay_bat_dau, { continued: true })
           .font('Roboto').text(' sau khi hai bên ký xác nhận.');
        doc.text(`12.2. Hợp đồng điện tử gồm 12 điều, được khởi tạo, ký số/ký điện tử và lưu trữ an toàn trên nền tảng TroHub, có giá trị pháp lý ràng buộc quyền và nghĩa vụ của các bên tương đương văn bản giấy.`);
        doc.moveDown(0.8);

        // Signatures
        const yStart = doc.y;
        const colWidth = 230;

        doc.font('Roboto-Bold').fontSize(10).fillColor('#000000').text('ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)', 50, yStart, { width: colWidth, align: 'center' });
        doc.font('Roboto-Italic').fontSize(8.5).fillColor('#64748B').text('(Ký, ghi rõ họ tên)', 50, yStart + 14, { width: colWidth, align: 'center' });

        if (landlordSignatureBuffer) {
            try {
                doc.image(landlordSignatureBuffer, 100, yStart + 30, { fit: [130, 45], align: 'center' });
            } catch (error) {
                console.error('[PDF_LANDLORD_SIGNATURE]', error.message);
            }
        }
        doc.font('Roboto-Bold').fontSize(10).fillColor('#000000').text(data.ten_chu_tro, 50, yStart + 80, { width: colWidth, align: 'center' });

        doc.font('Roboto-Bold').fontSize(10).fillColor('#000000').text('ĐẠI DIỆN BÊN THUÊ (BÊN B)', 310, yStart, { width: colWidth, align: 'center' });
        doc.font('Roboto-Italic').fontSize(8.5).fillColor('#64748B').text('(Đã ký điện tử qua TroHub)', 310, yStart + 14, { width: colWidth, align: 'center' });

        if (signatureBuffer) {
            try {
                doc.image(signatureBuffer, 360, yStart + 30, { fit: [130, 45], align: 'center' });
            } catch (error) {
                console.error('[PDF_SIGNATURE]', error.message);
            }
        }
        doc.font('Roboto-Bold').fontSize(10).fillColor('#000000').text(data.ten_nguoi_thue, 310, yStart + 80, { width: colWidth, align: 'center' });

        doc.end();
        stream.on('finish', () => {
            try {
                fs.renameSync(tempPath, outputPath);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        stream.on('error', (error) => {
            fs.rmSync(tempPath, { force: true });
            reject(error);
        });
    });
}

function renderContractHtml(data, landlordSignature, tenantSignature) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hợp đồng thuê nhà ở - ${data.so_hop_dong || 'TroHub'}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px 12px; color: #0f172a; line-height: 1.6; }
    .page { background: #ffffff; max-width: 800px; margin: 0 auto; padding: 40px 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .header { text-align: center; margin-bottom: 20px; }
    .header h3 { font-size: 13.5px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.2px; }
    .header h4 { font-size: 12px; font-weight: 600; margin: 4px 0 0 0; }
    .divider { width: 140px; height: 1px; background: #cbd5e1; margin: 8px auto 14px auto; }
    .date-row { text-align: right; font-size: 11.5px; font-style: italic; color: #475569; margin-bottom: 12px; }
    .title { font-size: 19px; font-weight: 900; color: #1e3a8a; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
    .sub-number { font-size: 12px; font-style: italic; color: #64748b; text-align: center; margin-bottom: 18px; }
    .legal-bases { background: #f8fafc; border-left: 3px solid #0d9488; padding: 10px 14px; font-size: 11.5px; font-style: italic; color: #475569; margin-bottom: 18px; border-radius: 0 8px 8px 0; }
    .legal-bases p { margin: 2px 0; }
    .intro-text { font-size: 12.5px; margin-bottom: 16px; font-weight: 500; }
    .section-header { font-size: 13px; font-weight: 800; color: #0d9488; text-transform: uppercase; margin: 18px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .info-list { font-size: 12.5px; margin: 0 0 14px 0; padding-left: 0; list-style: none; }
    .info-list li { margin-bottom: 5px; }
    .article-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 18px 0 6px 0; }
    .article-body { font-size: 12.5px; margin: 0 0 6px 0; text-align: justify; }
    strong, b { font-weight: 800; color: #000000; }
    .signatures { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
    .sign-col { width: 48%; text-align: center; }
    .sign-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
    .sign-sub { font-size: 11px; font-style: italic; color: #64748b; margin-top: 2px; }
    .sign-box { height: 80px; display: flex; align-items: center; justify-content: center; margin: 10px 0; }
    .sign-img { max-height: 70px; max-width: 160px; object-fit: contain; }
    .sign-name { font-size: 13px; font-weight: 800; color: #0f172a; }
    @media (max-width: 600px) {
      .page { padding: 24px 16px; }
      .signatures { flex-direction: column; gap: 24px; }
      .sign-col { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
      <h4>Độc lập - Tự do - Hạnh phúc</h4>
      <div class="divider"></div>
    </div>
    
    <div class="date-row">Hôm nay, ngày <strong>${data.ngay_ky}</strong> tháng <strong>${data.thang_ky}</strong> năm <strong>${data.nam_ky}</strong></div>
    <div class="title">HỢP ĐỒNG THUÊ NHÀ Ở</div>
    <div class="sub-number">Số: <strong>${data.so_hop_dong}</strong> / HĐTN</div>

    <div class="legal-bases">
      <p>- Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;</p>
      <p>- Căn cứ Luật Nhà ở ngày 27 tháng 11 năm 2023;</p>
      <p>- Căn cứ Luật Kinh doanh bất động sản ngày 28 tháng 11 năm 2023;</p>
      <p>- Căn cứ nhu cầu và khả năng thực tế của hai bên.</p>
    </div>

    <div class="intro-text">Hai bên chúng tôi thống nhất ký kết hợp đồng thuê nhà ở với các nội dung sau đây:</div>

    <div class="section-header">I. BÊN CHO THUÊ NHÀ Ở (BÊN A):</div>
    <ul class="info-list">
      <li>- Họ và tên: <strong>${data.ten_chu_tro}</strong></li>
      <li>- Số CCCD/CMND: <strong>${data.cccd_chu_tro}</strong></li>
      <li>- Điện thoại liên hệ: <strong>${data.sdt_chu_tro}</strong></li>
      <li>- Địa chỉ cư trú / Cơ sở: <strong>${data.dia_chi_chu_tro}</strong></li>
      ${data.stk_chu_tro && data.stk_chu_tro !== '........................' ? `<li>- Số tài khoản nhận tiền: <strong>${data.stk_chu_tro}</strong> tại Ngân hàng <strong>${data.ngan_hang_chu_tro}</strong> (Chủ TK: <strong>${data.ten_tai_khoan_chu_tro}</strong>)</li>` : ''}
    </ul>

    <div class="section-header">II. BÊN THUÊ NHÀ Ở (BÊN B):</div>
    <ul class="info-list">
      <li>- Họ và tên: <strong>${data.ten_nguoi_thue}</strong></li>
      <li>- Số CCCD/CMND: <strong>${data.cccd_nguoi_thue}</strong></li>
      <li>- Điện thoại liên hệ: <strong>${data.sdt_nguoi_thue}</strong></li>
      <li>- Nơi đăng ký cư trú / Địa chỉ: <strong>${data.dia_chi_nguoi_thue}</strong></li>
    </ul>

    <div class="article-title">Điều 1. Các thông tin về nhà ở cho thuê</div>
    <div class="article-body">1.1. Loại nhà ở: Phòng trọ / Căn hộ mini khép kín trong khuôn viên nhà ở.</div>
    <div class="article-body">1.2. Vị trí, địa điểm: Phòng số <strong>${data.ma_phong}</strong> (Tầng <strong>${data.tang_phong}</strong>), tại địa chỉ: <strong>${data.dia_chi_nha_tro}</strong>.</div>
    <div class="article-body">1.3. Diện tích sử dụng: Khoảng <strong>${data.dien_tich_phong} m²</strong>; Công năng sử dụng: Để ở sinh hoạt.</div>
    <div class="article-body">1.4. Hiện trạng chất lượng: Phòng trọ kiên cố, hệ thống điện nước, cửa khóa an toàn và trang thiết bị kèm theo hoạt động tốt, bảo đảm an toàn PCCC.</div>
    <div class="article-body">1.5. Chỉ số đồng hồ khi bàn giao: Điện: <strong>${data.chi_so_dien_ban_dau} kWh</strong>; Nước: <strong>${data.chi_so_nuoc_ban_dau} m³</strong>.</div>

    <div class="article-title">Điều 2. Giá thuê nhà ở, tiền cọc và chi phí dịch vụ</div>
    <div class="article-body">2.1. Giá thuê phòng cố định: <strong>${data.gia_thue} VNĐ/tháng</strong> (Bằng chữ: <strong>${data.gia_thue_bang_chu}</strong>).</div>
    <div class="article-body">2.2. Tiền đặt cọc giữ phòng: <strong>${data.tien_coc} VNĐ</strong> (Bằng chữ: <strong>${data.tien_coc_bang_chu}</strong>). Tiền đặt cọc được Bên A hoàn trả lại cho Bên B khi kết thúc hợp đồng sau khi đã khấu trừ hết các nghĩa vụ tài chính chưa thanh toán (nếu có).</div>
    <div class="article-body">2.3. Đơn giá điện tiêu thụ: <strong>${data.gia_dien} VNĐ/kWh</strong> (Theo chỉ số công tơ thực tế hàng tháng).</div>
    <div class="article-body">2.4. Đơn giá nước sinh hoạt: <strong>${data.gia_nuoc} VNĐ/m³</strong> (Theo chỉ số đồng hồ thực tế hàng tháng).</div>
    <div class="article-body">2.5. Chi phí dịch vụ cố định (rác, wifi, vệ sinh...): <strong>${data.phi_dich_vu} VNĐ/tháng</strong>.</div>

    <div class="article-title">Điều 3. Phương thức và thời hạn thanh toán</div>
    <div class="article-body">3.1. Phương thức thanh toán: Chuyển khoản ngân hàng (qua số tài khoản của Bên A hoặc quét mã VietQR tự động trên ứng dụng TroHub) hoặc thanh toán tiền mặt.</div>
    <div class="article-body">3.2. Thời hạn thanh toán: Định kỳ hàng tháng <strong>${data.ngay_thanh_toan_hang_thang}</strong> sau khi Bên A phát hành hóa đơn trên hệ thống TroHub.</div>

    <div class="article-title">Điều 4. Thời hạn cho thuê, thời điểm bàn giao nhà ở</div>
    <div class="article-body">4.1. Thời hạn cho thuê: <strong>${data.thoi_han_thang} tháng</strong>, tính từ ngày <strong>${data.ngay_bat_dau}</strong> đến hết ngày <strong>${data.ngay_ket_thuc}</strong>.</div>
    <div class="article-body">4.2. Thời điểm bàn giao phòng: Ngày <strong>${data.ngay_giao_phong || data.ngay_bat_dau}</strong>.</div>
    <div class="article-body">4.3. Hồ sơ kèm theo: Biên bản bàn giao hiện trạng phòng, chỉ số điện nước và Nội quy phòng trọ.</div>

    <div class="article-title">Điều 5. Sử dụng nhà ở thuê và bảo đảm an toàn</div>
    <div class="article-body">5.1. Bên B sử dụng nhà ở đúng mục đích để ở; chấp hành nghiêm chỉnh các quy định pháp luật về đăng ký tạm trú, an ninh trật tự và phòng cháy chữa cháy (PCCC).</div>
    <div class="article-body">5.2. Nghiêm cấm tàng trữ chất cấm, vũ khí, chất cháy nổ và các hoạt động vi phạm pháp luật trong khuôn viên nhà trọ.</div>
    <div class="article-body">5.3. Bên B có trách nhiệm giữ gìn vệ sinh chung, bảo quản tài sản và trang thiết bị được bàn giao.</div>

    <div class="article-title">Điều 6. Quyền và nghĩa vụ của Bên cho thuê</div>
    <div class="article-body">6.1. Bàn giao phòng và trang thiết bị cho Bên B đúng thời hạn đã thỏa thuận.</div>
    <div class="article-body">6.2. Bảo đảm quyền sử dụng ổn định, riêng tư cho Bên B trong suốt thời hạn hợp đồng.</div>
    <div class="article-body">6.3. Kịp thời tiếp nhận và xử lý các sự cố kỹ thuật hạ tầng (điện, nước, internet) khi Bên B gửi yêu cầu hỗ trợ.</div>
    <div class="article-body">6.4. Thu đúng, đủ các khoản tiền thuê và dịch vụ theo thỏa thuận.</div>

    <div class="article-title">Điều 7. Quyền và nghĩa vụ của Bên thuê</div>
    <div class="article-body">7.1. Nhận bàn giao phòng và sử dụng đúng công năng, diện tích đã thỏa thuận.</div>
    <div class="article-body">7.2. Thanh toán tiền phòng và chi phí điện nước, dịch vụ đúng hạn.</div>
    <div class="article-body">7.3. Tự bảo quản tài sản cá nhân; không tự ý đục phá, sửa chữa, thay đổi kết cấu phòng khi chưa có sự đồng ý bằng văn bản của Bên A.</div>
    <div class="article-body">7.4. Bồi thường thiệt hại thực tế nếu làm hư hỏng, mất mát tài sản của Bên A.</div>

    <div class="article-title">Điều 8. Trách nhiệm do vi phạm hợp đồng và Bất khả kháng</div>
    <div class="article-body">Bên nào vi phạm nghĩa vụ hợp đồng gây thiệt hại cho bên kia thì phải chịu trách nhiệm bồi thường theo quy định pháp luật, trừ trường hợp xảy ra sự kiện bất khả kháng (thiên tai, dịch bệnh, hỏa hoạn không do lỗi các bên) theo quy định của Bộ luật Dân sự.</div>

    <div class="article-title">Điều 9. Phạt vi phạm hợp đồng</div>
    <div class="article-body">Nếu Bên B tự ý chấm dứt hợp đồng trước thời hạn mà không thông báo trước tối thiểu 30 ngày hoặc vi phạm nghiêm trọng nội quy thì sẽ không được hoàn trả khoản tiền đặt cọc giữ phòng.</div>

    <div class="article-title">Điều 10. Chấm dứt hợp đồng và thanh lý</div>
    <div class="article-body">Hợp đồng chấm dứt khi: Hết thời hạn thuê; hai bên thỏa thuận chấm dứt; hoặc một bên đơn phương chấm dứt hợp pháp. Khi chấm dứt, hai bên cùng chốt chỉ số điện nước cuối kỳ, bàn giao lại phòng và hoàn tất thanh toán/hoàn trả tiền cọc.</div>

    <div class="article-title">Điều 11. Giải quyết tranh chấp</div>
    <div class="article-body">Mọi tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng hòa giải. Trường hợp không thể tự thương lượng, tranh chấp sẽ được yêu cầu Tòa án nhân dân có thẩm quyền tại địa phương nơi có bất động sản giải quyết.</div>

    <div class="article-title">Điều 12. Hiệu lực của hợp đồng</div>
    <div class="article-body">12.1. Hợp đồng này có hiệu lực kể từ ngày <strong>${data.ngay_bat_dau}</strong> sau khi hai bên ký xác nhận.</div>
    <div class="article-body">12.2. Hợp đồng điện tử gồm 12 điều, được khởi tạo, ký số/ký điện tử và lưu trữ an toàn trên nền tảng TroHub, có giá trị pháp lý ràng buộc quyền và nghĩa vụ của các bên tương đương văn bản giấy.</div>

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
        <div class="sign-sub">(Đã ký điện tử qua TroHub)</div>
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
