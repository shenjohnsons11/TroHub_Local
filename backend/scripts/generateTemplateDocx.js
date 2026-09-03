const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

async function createContractTemplate() {
    const templatesDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Times New Roman',
                        size: 24, // 12pt
                        color: '000000',
                    },
                    paragraph: {
                        spacing: {
                            line: 276, // 1.15 line spacing
                            after: 100,
                        },
                    },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,    // 1 inch
                        bottom: 1440,
                        left: 1440,
                        right: 1440,
                    },
                },
            },
            children: [
                // 1. Quốc hiệu - Tiêu ngữ
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 26 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 24 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 240 },
                    children: [
                        new TextRun({ text: '-----------------------', bold: true }),
                    ],
                }),

                // 2. Tiêu đề hợp đồng
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 240 },
                    children: [
                        new TextRun({ text: 'HỢP ĐỒNG THUÊ PHÒNG TRỌ / NHÀ TRỌ', bold: true, size: 32, color: '1A365D' }),
                    ],
                }),

                new Paragraph({
                    spacing: { after: 140 },
                    children: [
                        new TextRun({ text: 'Hôm nay, ngày ký kết hợp đồng điện tử thông qua nền tảng TroHub.' }),
                    ],
                }),

                new Paragraph({
                    spacing: { after: 140 },
                    children: [
                        new TextRun({ text: 'Chúng tôi gồm có các bên tham gia ký kết dưới đây:' }),
                    ],
                }),

                // 3. BÊN CHO THUÊ (BÊN A)
                new Paragraph({
                    spacing: { before: 140, after: 80 },
                    children: [
                        new TextRun({ text: 'BÊN CHO THUÊ (BÊN A):', bold: true, size: 26, color: '0F766E' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '- Họ và tên: ', bold: true }),
                        new TextRun({ text: '{ten_chu_tro}', bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '- Số CCCD/CMND: ', bold: true }),
                        new TextRun({ text: '{cccd_chu_tro}', bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '- Số điện thoại: ', bold: true }),
                        new TextRun({ text: '{sdt_chu_tro}', bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 160 },
                    children: [
                        new TextRun({ text: '- Địa chỉ nhà trọ: ', bold: true }),
                        new TextRun({ text: '{dia_chi_nha_tro}', bold: true }),
                    ],
                }),

                // 4. BÊN THUÊ (BÊN B)
                new Paragraph({
                    spacing: { before: 140, after: 80 },
                    children: [
                        new TextRun({ text: 'BÊN THUÊ PHÒNG (BÊN B):', bold: true, size: 26, color: '0F766E' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '- Họ và tên: ', bold: true }),
                        new TextRun({ text: '{ten_nguoi_thue}', bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '- Số CCCD/CMND: ', bold: true }),
                        new TextRun({ text: '{cccd_nguoi_thue}', bold: true }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 180 },
                    children: [
                        new TextRun({ text: '- Số điện thoại liên hệ: ', bold: true }),
                        new TextRun({ text: '{sdt_nguoi_thue}', bold: true }),
                    ],
                }),

                // 5. NỘI DUNG ĐIỀU KHOẢN
                new Paragraph({
                    spacing: { before: 160, after: 100 },
                    children: [
                        new TextRun({ text: 'ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ', bold: true, size: 26 }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '1.1. Bên A đồng ý cho Bên B thuê phòng số: ' }),
                        new TextRun({ text: '{ma_phong}', bold: true }),
                        new TextRun({ text: ' tại địa chỉ: ' }),
                        new TextRun({ text: '{dia_chi_nha_tro}', bold: true }),
                        new TextRun({ text: '.' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '1.2. Thời hạn hợp đồng có hiệu lực từ ngày ' }),
                        new TextRun({ text: '{ngay_bat_dau}', bold: true }),
                        new TextRun({ text: ' đến ngày ' }),
                        new TextRun({ text: '{ngay_ket_thuc}', bold: true }),
                        new TextRun({ text: '.' }),
                    ],
                }),

                new Paragraph({
                    spacing: { before: 160, after: 100 },
                    children: [
                        new TextRun({ text: 'ĐIỀU 2: GIÁ THUÊ, TIỀN CỌC VÀ CHI PHÍ DỊCH VỤ', bold: true, size: 26 }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '2.1. Giá thuê phòng cố định: ' }),
                        new TextRun({ text: '{gia_thue} VNĐ/tháng', bold: true, color: 'B91C1C' }),
                        new TextRun({ text: ' (Thanh toán định kỳ hàng tháng).' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '2.2. Tiền đặt cọc giữ phòng và bảo đảm tài sản: ' }),
                        new TextRun({ text: '{tien_coc} VNĐ', bold: true }),
                        new TextRun({ text: ' (Được hoàn lại khi kết thúc hợp đồng theo quy định).' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '2.3. Đơn giá điện tiêu thụ: ' }),
                        new TextRun({ text: '{gia_dien} VNĐ/kWh', bold: true }),
                        new TextRun({ text: ' (Theo chỉ số công tơ điện thực tế).' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '2.4. Đơn giá nước sinh hoạt: ' }),
                        new TextRun({ text: '{gia_nuoc} VNĐ/m³', bold: true }),
                        new TextRun({ text: ' (Theo chỉ số đồng hồ nước thực tế).' }),
                    ],
                }),
                new Paragraph({
                    spacing: { after: 180 },
                    children: [
                        new TextRun({ text: '2.5. Chi phí dịch vụ cố định (rác, internet, quản lý): ' }),
                        new TextRun({ text: '{phi_dich_vu} VNĐ/tháng', bold: true }),
                        new TextRun({ text: '.' }),
                    ],
                }),

                new Paragraph({
                    spacing: { before: 160, after: 100 },
                    children: [
                        new TextRun({ text: 'ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN', bold: true, size: 26 }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '3.1. Bên B có trách nhiệm thanh toán đầy đủ hóa đơn tiền phòng và điện nước đúng thời hạn thông báo trên ứng dụng TroHub.' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '3.2. Giữ gìn an ninh trật tự, phòng cháy chữa cháy, không tự ý sửa chữa hoặc làm hư hỏng cơ sở vật chất phòng trọ.' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: '3.3. Bên A có trách nhiệm bàn giao phòng đầy đủ tiện nghi, cung cấp điện nước ổn định và hỗ trợ xử lý sự cố kịp thời.' }),
                    ],
                }),

                // 6. PHẦN CHỮ KÝ CÁC BÊN
                new Paragraph({
                    spacing: { before: 300, after: 200 },
                    children: [
                        new TextRun({ text: 'Hợp đồng này được lập thành bản điện tử có giá trị pháp lý tương đương văn bản giấy kể từ thời điểm Bên B ký xác nhận.', italics: true }),
                    ],
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.NONE },
                                        bottom: { style: BorderStyle.NONE },
                                        left: { style: BorderStyle.NONE },
                                        right: { style: BorderStyle.NONE },
                                    },
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new TextRun({ text: 'ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)', bold: true }),
                                            ],
                                        }),
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new TextRun({ text: '(Ký, ghi rõ họ tên)', italics: true, size: 20 }),
                                            ],
                                        }),
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 600 },
                                            children: [
                                                new TextRun({ text: '{ten_chu_tro}', bold: true }),
                                            ],
                                        }),
                                    ],
                                }),
                                new TableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.NONE },
                                        bottom: { style: BorderStyle.NONE },
                                        left: { style: BorderStyle.NONE },
                                        right: { style: BorderStyle.NONE },
                                    },
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new TextRun({ text: 'ĐẠI DIỆN BÊN THUÊ PHÒNG (BÊN B)', bold: true }),
                                            ],
                                        }),
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new TextRun({ text: '(Đã ký điện tử)', italics: true, size: 20 }),
                                            ],
                                        }),
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            spacing: { before: 200, after: 200 },
                                            children: [
                                                new TextRun({ text: '{%chu_ky_nguoi_thue%}' }),
                                            ],
                                        }),
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new TextRun({ text: '{ten_nguoi_thue}', bold: true }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const targetFile = path.join(templatesDir, 'hop-dong-thue-nha-tro.docx');
    fs.writeFileSync(targetFile, buffer);
    console.log('✅ Template Word được tạo thành công tại:', targetFile);
}

createContractTemplate().catch(console.error);
