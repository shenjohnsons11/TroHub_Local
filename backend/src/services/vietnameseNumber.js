const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ'];

function readThreeDigits(value, full) {
    const hundreds = Math.floor(value / 100);
    const remainder = value % 100;
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    const words = [];

    if (hundreds || full) words.push(`${DIGITS[hundreds]} trăm`);
    if (tens >= 2) {
        words.push(`${DIGITS[tens]} mươi`);
        if (ones) words.push(ones === 1 ? 'mốt' : ones === 4 ? 'tư' : ones === 5 ? 'lăm' : DIGITS[ones]);
    } else if (tens === 1) {
        words.push('mười');
        if (ones) words.push(ones === 5 ? 'lăm' : DIGITS[ones]);
    } else if (ones) {
        if (hundreds || full) words.push('lẻ');
        words.push(DIGITS[ones]);
    }

    return words.join(' ');
}

function numberToVietnameseWords(amount) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 999999999999) {
        throw new RangeError('Số tiền phải là số nguyên không âm, tối đa 999.999.999.999 đồng.');
    }
    if (amount === 0) return 'Không đồng';

    const groups = [];
    let value = amount;
    while (value) {
        groups.push(value % 1000);
        value = Math.floor(value / 1000);
    }

    const words = [];
    for (let index = groups.length - 1; index >= 0; index -= 1) {
        const group = groups[index];
        if (!group) continue;
        const full = index < groups.length - 1;
        words.push(readThreeDigits(group, full));
        if (index) words.push(SCALES[index]);
    }

    const result = words.join(' ');
    return `${result[0].toUpperCase()}${result.slice(1)} đồng`;
}

module.exports = { numberToVietnameseWords };
