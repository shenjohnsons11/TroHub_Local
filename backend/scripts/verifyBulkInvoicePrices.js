const assert = require('node:assert/strict');
const {
    resolveContractMeterSnapshot,
    resolveUtilityPriceDefaults,
} = require('../src/services/contractTerms');

const legacyContract = { services: [] };
const defaults = { electricityPrice: 3500, waterPrice: 15000 };
const snapshot = resolveContractMeterSnapshot(legacyContract, null, {}, defaults);

assert.equal(snapshot.electricityPrice, 3500);
assert.equal(snapshot.waterPrice, 15000);

const configuredDefaults = resolveUtilityPriceDefaults([
    { code: 'ELECTRICITY', type: 1, defaultPrice: 4200 },
    { name: 'Nước máy', type: 1, defaultPrice: 18000 },
    { name: 'Nước uống', type: 2, defaultPrice: 100000 },
]);
const configuredSnapshot = resolveContractMeterSnapshot(legacyContract, null, {}, configuredDefaults);
assert.equal(configuredSnapshot.electricityPrice, 4200);
assert.equal(configuredSnapshot.waterPrice, 18000);

const contractSnapshot = resolveContractMeterSnapshot({ electricityPrice: 3900, waterPrice: 14000, services: [] }, null, {}, configuredDefaults);
assert.equal(contractSnapshot.electricityPrice, 3900);
assert.equal(contractSnapshot.waterPrice, 14000);

const zeroPriceSnapshot = resolveContractMeterSnapshot({ electricityPrice: 0, waterPrice: 0, services: [] }, null, {}, configuredDefaults);
assert.equal(zeroPriceSnapshot.electricityPrice, 4200);
assert.equal(zeroPriceSnapshot.waterPrice, 18000);

console.log('Batch invoice price fallback check passed.');
