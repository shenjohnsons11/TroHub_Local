const fs = require('fs');
const path = require('path');
<<<<<<< HEAD
=======
const os = require('os');
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const PDFDocument = require('pdfkit');

async function testGeneration() {
    console.log('Testing DOCX and PDF template generation...');

    const templatePath = path.join(__dirname, '../templates/hop-dong-thue-nha-tro.docx');
    if (!fs.existsSync(templatePath)) {
        console.error('Template hop-dong-thue-nha-tro.docx not found!');
        process.exit(1);
    }

<<<<<<< HEAD
    const contractsDir = path.join(__dirname, '../public/contracts');
    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
    }
=======
    const contractsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trohub-contract-generator-'));
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e

    // Sample signature buffer (1x1 red PNG or transparent PNG)
    const sampleSignature = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAK8AAABOCAYAAAB8d1ZPAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAA' +
        'ABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFQSURBVHic7dxBDYAwEMVAJ14uF+kAg+GkAQeU5M2b' +
        'k5m17tq8V193d25d19V9u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7' +
        'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7' +
        'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7' +
        'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7' +
        'u7u7u7u7u7u7u7u7u7u7u7u7u7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7s7',
        'base64'
    );

    const templateData = {
        ten_chu_tro: 'NGUYỄN VĂN AN (CHỦ TRỌ)',
        cccd_chu_tro: '079198001234',
        sdt_chu_tro: '0901234567',
        dia_chi_nha_tro: '123 Đường Số 5, Phường Linh Trung, TP. Thủ Đức, TP.HCM',
        ten_nguoi_thue: 'TRẦN THỊ BÍCH (NGƯỜI THUÊ)',
        cccd_nguoi_thue: '079200009876',
        sdt_nguoi_thue: '0987654321',
        ma_phong: 'P.302',
        gia_thue: '3.500.000',
        tien_coc: '3.500.000',
        ngay_bat_dau: '01/09/2026',
        ngay_ket_thuc: '01/09/2027',
        gia_dien: '3.500',
        gia_nuoc: '20.000',
        phi_dich_vu: '150.000',
    };

    // 1. DOCX
    const docxOutputPath = path.join(contractsDir, 'test-contract.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const imageOptions = {
        centered: true,
        getImage: () => sampleSignature,
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
    fs.writeFileSync(docxOutputPath, buf);
    console.log('✅ Generated test DOCX:', docxOutputPath, `(${buf.length} bytes)`);

    // 2. PDF
    const pdfOutputPath = path.join(contractsDir, 'test-contract.pdf');
    await new Promise((resolve, reject) => {
        const pdfDoc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 55, right: 55 } });
        const stream = fs.createWriteStream(pdfOutputPath);
        pdfDoc.pipe(stream);

        pdfDoc.fontSize(13).font('Helvetica-Bold').text('CONG HOA XA HOI CHU NGHIA VIET NAM', { align: 'center' });
        pdfDoc.fontSize(11).font('Helvetica').text('Doc lap - Tu do - Hanh phuc', { align: 'center' });
        pdfDoc.fontSize(10).text('-----------------------', { align: 'center' });
        pdfDoc.moveDown(1.2);

        pdfDoc.fontSize(16).font('Helvetica-Bold').fillColor('#1A365D').text('HOP DONG THUE PHONG TRO / NHA TRO', { align: 'center' });
        pdfDoc.moveDown(0.8);

        pdfDoc.fontSize(10).font('Helvetica').fillColor('#000000');
        pdfDoc.text('Hom nay, cac ben dong y ky ket hop dong dien tu tren nen tang TroHub voi cac thong tin sau:');
        pdfDoc.moveDown(0.6);

        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#0F766E').text('BEN CHO THUE (BEN A):');
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#000000');
        pdfDoc.text(`- Ho va ten: ${templateData.ten_chu_tro}`);
        pdfDoc.text(`- So CCCD/CMND: ${templateData.cccd_chu_tro}`);
        pdfDoc.text(`- So dien thoai: ${templateData.sdt_chu_tro}`);
        pdfDoc.text(`- Dia chi nha tro: ${templateData.dia_chi_nha_tro}`);
        pdfDoc.moveDown(0.6);

        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#0F766E').text('BEN THUE PHONG (BEN B):');
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#000000');
        pdfDoc.text(`- Ho va ten: ${templateData.ten_nguoi_thue}`);
        pdfDoc.text(`- So CCCD/CMND: ${templateData.cccd_nguoi_thue}`);
        pdfDoc.text(`- So dien thoai: ${templateData.sdt_nguoi_thue}`);
        pdfDoc.moveDown(0.8);

        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('DIEU 1: DOI TUONG VA THOI HAN THUE');
        pdfDoc.fontSize(10).font('Helvetica');
        pdfDoc.text(`1.1. Ben A dong y cho Ben B thue phong so: ${templateData.ma_phong} tai dia chi: ${templateData.dia_chi_nha_tro}.`);
        pdfDoc.text(`1.2. Thoi han thue: Tu ngay ${templateData.ngay_bat_dau} den ngay ${templateData.ngay_ket_thuc}.`);
        pdfDoc.moveDown(0.6);

        pdfDoc.fontSize(11).font('Helvetica-Bold').text('DIEU 2: GIA THUE, TIEN COC VA DICH VU');
        pdfDoc.fontSize(10).font('Helvetica');
        pdfDoc.text(`2.1. Gia thue phong co dinh: ${templateData.gia_thue} VND/thang (Thanh toan dinh ky hang thang).`);
        pdfDoc.text(`2.2. Tien dat coc giu phong: ${templateData.tien_coc} VND (Hoan tra khi thanh ly hop dong).`);
        pdfDoc.text(`2.3. Don gia dien tieu thu: ${templateData.gia_dien} VND/kWh (Theo cong to thuc te).`);
        pdfDoc.text(`2.4. Don gia nuoc sinh hoat: ${templateData.gia_nuoc} VND/m3 (Theo dong ho thuc te).`);
        pdfDoc.text(`2.5. Chi phi dich vu co dinh: ${templateData.phi_dich_vu} VND/thang.`);
        pdfDoc.moveDown(0.6);

        pdfDoc.fontSize(11).font('Helvetica-Bold').text('DIEU 3: QUYEN VA NGHIA VU');
        pdfDoc.fontSize(10).font('Helvetica');
        pdfDoc.text('3.1. Ben B thanh toan day du hoa don tien phong va dien nuoc dung thoi han tren TroHub.');
        pdfDoc.text('3.2. Giu gin an ninh trat tu, phong chay chua chay, khong lam hu hong tai san.');
        pdfDoc.text('3.3. Ben A ban giao phong day du tien nghi, ho tro giai quyet su co kip thoi.');
        pdfDoc.moveDown(1);

        pdfDoc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555').text('Hop dong dien tu co gia tri phap ly tuong duong van ban giay ke tu luc Ben B ky xac nhan.', { align: 'center' });
        pdfDoc.moveDown(1.2);

        const yStart = pdfDoc.y;
        const colWidth = 220;

        pdfDoc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('DAI DIEN BEN CHO THUE (BEN A)', 60, yStart, { width: colWidth, align: 'center' });
        pdfDoc.fontSize(9).font('Helvetica-Oblique').text('(Ky, ghi ro ho ten)', 60, yStart + 16, { width: colWidth, align: 'center' });
        pdfDoc.fontSize(10).font('Helvetica-Bold').text(templateData.ten_chu_tro, 60, yStart + 85, { width: colWidth, align: 'center' });

        pdfDoc.fontSize(10).font('Helvetica-Bold').text('DAI DIEN BEN THUE (BEN B)', 310, yStart, { width: colWidth, align: 'center' });
        pdfDoc.fontSize(9).font('Helvetica-Oblique').text('(Da ky dien tu)', 310, yStart + 16, { width: colWidth, align: 'center' });

        if (sampleSignature) {
            try {
                pdfDoc.image(sampleSignature, 355, yStart + 35, { fit: [130, 45], align: 'center' });
            } catch (err) {
                console.log('PDF signature embed warning:', err.message);
            }
        }

        pdfDoc.fontSize(10).font('Helvetica-Bold').text(templateData.ten_nguoi_thue, 310, yStart + 85, { width: colWidth, align: 'center' });

        pdfDoc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    console.log('✅ Generated test PDF:', pdfOutputPath, `(${fs.statSync(pdfOutputPath).size} bytes)`);
<<<<<<< HEAD
=======
    fs.rmSync(contractsDir, { recursive: true, force: true });
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
}

testGeneration().catch(console.error);
