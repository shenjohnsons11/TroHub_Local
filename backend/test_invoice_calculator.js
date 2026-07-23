const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const calculatorPath = './src/services/invoiceCalculator';

test('calculates meter usage and rounds the charge to whole VND', () => {
    const { calculateMeterCharge } = require(calculatorPath);

    assert.deepEqual(
        calculateMeterCharge({
            label: 'Điện',
            oldIndex: 120.25,
            newIndex: 135.75,
            unitPrice: 3500.4,
        }),
        {
            oldIndex: 120.25,
            newIndex: 135.75,
            unitPrice: 3500.4,
            usage: 15.5,
            amount: 54256,
        }
    );
});

test('rejects a new meter index lower than the previous index', () => {
    const { calculateMeterCharge } = require(calculatorPath);

    assert.throws(
        () => calculateMeterCharge({
            label: 'Nước',
            oldIndex: 42,
            newIndex: 41,
            unitPrice: 15000,
        }),
        (error) => {
            assert.equal(error.code, 'METER_INDEX_REGRESSION');
            assert.match(error.message, /Nước/);
            return true;
        }
    );
});

test('rejects non-finite and negative calculation inputs', () => {
    const { calculateMeterCharge } = require(calculatorPath);

    for (const invalidValue of [Number.NaN, Number.POSITIVE_INFINITY, -1, 'abc', '']) {
        assert.throws(
            () => calculateMeterCharge({
                label: 'Điện',
                oldIndex: 0,
                newIndex: invalidValue,
                unitPrice: 3500,
            }),
            (error) => error.code === 'INVALID_CALCULATION_INPUT'
        );
    }
});

test('calculates the authoritative invoice total and ignores client total', () => {
    const { calculateInvoiceAmounts } = require(calculatorPath);

    const result = calculateInvoiceAmounts({
        roomAmount: 3000000,
        electricityOld: 100,
        electricityNew: 125,
        electricityPrice: 3500,
        waterOld: 20,
        waterNew: 23,
        waterPrice: 15000,
        services: 100000,
        parking: 80000,
        internet: 120000,
        garbage: 30000,
        discount: 55000,
        penalty: 0,
        total: 1,
        totalAmount: 2,
    });

    assert.equal(result.electricity, 87500);
    assert.equal(result.water, 45000);
    assert.equal(result.subtotal, 3462500);
    assert.equal(result.totalAmount, 3407500);
});

test('never persists a negative invoice total when discount exceeds subtotal', () => {
    const { calculateInvoiceAmounts } = require(calculatorPath);

    const result = calculateInvoiceAmounts({
        roomAmount: 100000,
        electricityOld: 0,
        electricityNew: 0,
        electricityPrice: 0,
        waterOld: 0,
        waterNew: 0,
        waterPrice: 0,
        discount: 200000,
    });

    assert.equal(result.subtotal, 100000);
    assert.equal(result.totalAmount, 0);
});

test('invoice creation paths use the authoritative calculator', () => {
    const controllerSource = fs.readFileSync(
        path.join(__dirname, 'src/controllers/invoiceController.js'),
        'utf8'
    );
    const calculatorCalls =
        controllerSource.match(/calculateInvoiceAmounts\(/g) || [];

    assert.ok(
        calculatorCalls.length >= 2,
        'Single and bulk invoice creation must share calculateInvoiceAmounts'
    );
    assert.doesNotMatch(controllerSource, /Number\(req\.body\.total\)/);
    assert.doesNotMatch(
        controllerSource,
        /Math\.max\(0,\s*electricityNew\s*-\s*electricityOld\)/
    );
    assert.doesNotMatch(
        controllerSource,
        /Math\.max\(0,\s*waterNew\s*-\s*waterOld\)/
    );
});

test('bulk preview treats room drafts as new-index suggestions only', () => {
    const controllerSource = fs.readFileSync(
        path.join(__dirname, 'src/controllers/invoiceController.js'),
        'utf8'
    );

    assert.doesNotMatch(
        controllerSource,
        /let electricityOld = contract\.roomId\.draftElectricity/
    );
    assert.doesNotMatch(
        controllerSource,
        /let waterOld = contract\.roomId\.draftWater/
    );
});
