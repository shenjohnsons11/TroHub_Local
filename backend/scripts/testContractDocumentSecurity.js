const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { numberToVietnameseWords } = require('../src/services/vietnameseNumber');
const {
    generateContractPdf,
    PDF_DOCUMENT_VERSION,
    fontPaths,
} = require('../src/services/contractGeneratorService');
const {
    normalizeId,
    canViewContract,
    canDownloadDocx,
} = require('../src/services/contractDocumentPolicy');

const owner = { id: 'owner-1', role: 1 };
const otherOwner = { id: 'owner-2', role: 1 };
const tenant = { id: 'tenant-1', role: 2 };
const otherTenant = { id: 'tenant-2', role: 2 };
const contract = {
    roomId: { landlordId: 'owner-1' },
    tenantId: 'tenant-1',
    status: 0,
};
const flatContract = {
    roomLandlordId: { toHexString: () => 'owner-1' },
    tenantId: 'tenant-1',
    status: 0,
};

assert.equal(
    numberToVietnameseWords(8900000),
    'Tám triệu chín trăm nghìn đồng'
);
assert.equal(numberToVietnameseWords(0), 'Không đồng');

assert.equal(normalizeId({}), '');
assert.equal(normalizeId({ toString: () => 'not-an-id' }), '');
assert.equal(normalizeId({ toHexString: () => 'owner-1' }), 'owner-1');
assert.equal(normalizeId({ toHexString: () => { throw new Error('malformed'); } }), '');

assert.equal(canViewContract({ contract, user: owner }), true);
assert.equal(canViewContract({ contract, user: otherOwner }), false);
assert.equal(canViewContract({ contract, user: tenant }), true);
assert.equal(canViewContract({ contract: flatContract, user: owner }), true);
assert.equal(canViewContract({ contract: flatContract, user: { id: { toHexString: () => 'owner-1' }, role: 1 } }), true);
assert.equal(canViewContract({ contract: flatContract, user: otherTenant }), false);
assert.equal(canViewContract({ role: 1, userId: 'owner-1' }, contract), true);
assert.equal(canViewContract({ role: 2, userId: 'tenant-1' }, contract), true);
assert.equal(canViewContract({ role: true, userId: 'owner-1' }, contract), false);
assert.equal(canViewContract({ role: '1', userId: 'owner-1' }, contract), false);

assert.equal(canDownloadDocx({ contract: { ...contract, status: 4 }, user: tenant }), false);
assert.equal(canDownloadDocx({ contract: { ...contract, status: 0 }, user: tenant }), false);
assert.equal(canDownloadDocx({ contract: { ...contract, status: 4 }, user: owner }), false);
assert.equal(canDownloadDocx({ contract: { ...contract, status: 1 }, user: owner }), false);
assert.equal(canDownloadDocx({ contract, user: owner }), true);
assert.equal(canDownloadDocx({ contract: { ...contract, status: '0' }, user: owner }), false);
assert.equal(canDownloadDocx({ contract: { ...contract, status: null }, user: owner }), false);
assert.equal(canDownloadDocx({ contract: flatContract, user: owner }), true);
assert.equal(canDownloadDocx({ role: 1, userId: 'owner-1' }, contract), true);
assert.equal(canDownloadDocx({ role: 2, userId: 'tenant-1' }, contract), false);

(async () => {
    assert.equal(PDF_DOCUMENT_VERSION, 1);
    for (const fontPath of Object.values(fontPaths)) {
        assert.equal(path.extname(fontPath), '.ttf');
        assert.equal(fs.existsSync(fontPath), true, `missing packaged font: ${fontPath}`);
    }

    const pdfPath = path.join(os.tmpdir(), `trohub-contract-${process.pid}.pdf`);
    await generateContractPdf({
        outputPath: pdfPath,
        data: {
            ten_chu_tro: 'Nguyễn Văn A',
            cccd_chu_tro: '012345678901',
            sdt_chu_tro: '0900000000',
            dia_chi_nha_tro: 'Đường Số 1',
            ten_nguoi_thue: 'Trần Thị B',
            cccd_nguoi_thue: '012345678902',
            sdt_nguoi_thue: '0900000001',
            ma_phong: 'P101',
            gia_thue: '3.000.000',
            tien_coc: '6.000.000',
            tien_coc_bang_chu: 'Sáu triệu đồng',
            ngay_bat_dau: '01/01/2026',
            ngay_ket_thuc: '31/12/2026',
            gia_dien: '3.500',
            gia_nuoc: '20.000',
            phi_dich_vu: '100.000',
        },
    });
    assert.equal(fs.existsSync(pdfPath), true);
    assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)) }).promise;
    const page = await pdf.getPage(1);
    const text = (await page.getTextContent()).items.map((item) => item.str).join(' ');
    assert.match(text, /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/);
    assert.match(text, /Nguyễn Văn A/);
    assert.match(text, /Sáu triệu đồng/);
    fs.rmSync(pdfPath, { force: true });
    console.log('contract document security: ok');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
