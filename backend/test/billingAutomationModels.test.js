const assert = require('node:assert/strict');
const test = require('node:test');

const BillingPolicy = require('../src/models/BillingPolicy');
const Invoice = require('../src/models/Invoice');
const { normalizeBillingPolicy } = require('../src/services/billingPolicy');

test('BillingPolicy exposes the approved automation defaults and limits', () => {
    const expected = {
        autoInvoiceEnabled: { defaultValue: true },
        invoiceDay: { defaultValue: 25, min: 1, max: 31 },
        dueDay: { defaultValue: 5, min: 1, max: 31 },
        autoRemindEnabled: { defaultValue: true },
        remindDaysBeforeDue: { defaultValue: 2, min: 1, max: 31 },
    };

    for (const [field, options] of Object.entries(expected)) {
        const path = BillingPolicy.schema.path(field);
        assert.ok(path, `${field} must exist`);
        assert.equal(path.options.default, options.defaultValue);
        if (options.min !== undefined) assert.equal(path.options.min, options.min);
        if (options.max !== undefined) assert.equal(path.options.max, options.max);
    }
});

test('billing policy normalization validates and returns automation fields', () => {
    const policy = normalizeBillingPolicy({
        lateFeeGraceDays: 3,
        lateFeeRate: 5,
        invoiceDay: 31,
        dueDay: 29,
        remindDaysBeforeDue: 2,
        autoInvoiceEnabled: false,
        autoRemindEnabled: false,
    });

    assert.equal(policy.invoiceDay, 31);
    assert.equal(policy.dueDay, 29);
    assert.equal(policy.remindDaysBeforeDue, 2);
    assert.equal(policy.autoInvoiceEnabled, false);
    assert.equal(policy.autoRemindEnabled, false);
    assert.throws(
        () => normalizeBillingPolicy({ lateFeeGraceDays: 3, lateFeeRate: 5, invoiceDay: 32 }),
        (error) => error.field === 'invoiceDay',
    );
});

test('Invoice has a partial unique automationKey index', () => {
    assert.ok(Invoice.schema.path('automationKey'));
    const index = Invoice.schema.indexes().find(([fields]) => fields.automationKey === 1);
    assert.ok(index, 'automationKey index must exist');
    assert.equal(index[1].unique, true);
    assert.deepEqual(index[1].partialFilterExpression, {
        automationKey: { $type: 'string' },
    });
});
