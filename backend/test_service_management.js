const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trohub_secret_key_2026';

function createResponseRecorder() {
    return {
        statusCode: 200,
        payload: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        },
    };
}

test('Admin middleware rejects missing and Người thuê tokens', async () => {
    const { requireAdmin } = require('./src/middleware/requireAdmin');

    const missingResponse = createResponseRecorder();
    await requireAdmin({ headers: {} }, missingResponse, () => {
        assert.fail('Missing token must not reach the controller');
    });
    assert.equal(missingResponse.statusCode, 401);

    const nguoiThueToken = jwt.sign({ id: 'nguoi-thue-1', role: 2 }, JWT_SECRET);
    const roleResponse = createResponseRecorder();
    await requireAdmin(
        { headers: { authorization: `Bearer ${nguoiThueToken}` } },
        roleResponse,
        () => assert.fail('Người thuê token must not reach the controller')
    );
    assert.equal(roleResponse.statusCode, 403);
});

test('Admin middleware attaches verified identity and continues', async () => {
    const { requireAdmin } = require('./src/middleware/requireAdmin');
    const token = jwt.sign({ id: 'admin-1', role: 1 }, JWT_SECRET);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = createResponseRecorder();
    let continued = false;

    await requireAdmin(request, response, () => {
        continued = true;
    });

    assert.equal(continued, true);
    assert.deepEqual(request.auth, { id: 'admin-1', role: 1 });
});

test('service input normalization whitelists fields and ignores landlordId', () => {
    const { normalizeServiceInput } = require('./src/services/serviceManagement');

    assert.deepEqual(
        normalizeServiceInput({
            name: '  Điện sinh hoạt ',
            code: ' dien-sinh-hoat ',
            type: 1,
            unit: ' kWh ',
            defaultPrice: '3500',
            isActive: true,
            landlordId: 'attacker-controlled',
            unexpected: 'discarded',
        }),
        {
            name: 'Điện sinh hoạt',
            code: 'DIEN-SINH-HOAT',
            type: 1,
            unit: 'kWh',
            defaultPrice: 3500,
            isActive: true,
        }
    );
});

test('service input rejects invalid type and price', () => {
    const { normalizeServiceInput } = require('./src/services/serviceManagement');

    assert.throws(
        () => normalizeServiceInput({
            name: 'Điện',
            code: 'DIEN',
            type: 3,
            unit: 'kWh',
            defaultPrice: 3500,
        }),
        (error) => error.code === 'INVALID_SERVICE_TYPE'
    );

    assert.throws(
        () => normalizeServiceInput({
            name: 'Điện',
            code: 'DIEN',
            type: 1,
            unit: 'kWh',
            defaultPrice: -1,
        }),
        (error) => error.code === 'INVALID_SERVICE_PRICE'
    );
});

test('service routes apply Admin authorization to the entire router', () => {
    const router = require('./src/routes/serviceRoutes');
    const middlewareNames = router.stack.map((layer) => layer.name);

    assert.ok(middlewareNames.includes('requireAdmin'));
});

test('create service derives ownership from authenticated Admin', async (context) => {
    const Service = require('./src/models/Service');
    const controller = require('./src/controllers/serviceController');
    const originalFindOne = Service.findOne;
    const originalSave = Service.prototype.save;
    let savedDocument;

    Service.findOne = async () => null;
    Service.prototype.save = async function saveForTest() {
        savedDocument = this;
        return this;
    };
    context.after(() => {
        Service.findOne = originalFindOne;
        Service.prototype.save = originalSave;
    });

    const response = createResponseRecorder();
    await controller.createService(
        {
            auth: { id: '507f1f77bcf86cd799439011', role: 1 },
            body: {
                name: 'Internet',
                code: 'internet',
                type: 2,
                unit: 'tháng',
                defaultPrice: 120000,
                landlordId: '507f191e810c19729de860ea',
            },
        },
        response
    );

    assert.equal(response.statusCode, 201);
    assert.equal(savedDocument.landlordId.toString(), '507f1f77bcf86cd799439011');
    assert.equal(savedDocument.code, 'INTERNET');
});

test('list services always scopes the query to authenticated Admin', async (context) => {
    const Service = require('./src/models/Service');
    const controller = require('./src/controllers/serviceController');
    const originalFind = Service.find;
    let capturedQuery;

    Service.find = (query) => {
        capturedQuery = query;
        return { sort: async () => [] };
    };
    context.after(() => {
        Service.find = originalFind;
    });

    const response = createResponseRecorder();
    await controller.getAllServices(
        {
            auth: { id: '507f1f77bcf86cd799439011', role: 1 },
            query: { landlordId: '507f191e810c19729de860ea' },
        },
        response
    );

    assert.deepEqual(capturedQuery, {
        landlordId: '507f1f77bcf86cd799439011',
    });
    assert.equal(response.statusCode, 200);
});

test('delete archives a service referenced by a contract', async (context) => {
    const Service = require('./src/models/Service');
    const Contract = require('./src/models/Contract');
    const controller = require('./src/controllers/serviceController');
    const originalFindOne = Service.findOne;
    const originalExists = Contract.exists;
    let saved = false;

    const service = {
        _id: 'service-1',
        isActive: true,
        async save() {
            saved = true;
            return this;
        },
    };
    Service.findOne = async () => service;
    Contract.exists = async () => ({ _id: 'contract-1' });
    context.after(() => {
        Service.findOne = originalFindOne;
        Contract.exists = originalExists;
    });

    const response = createResponseRecorder();
    await controller.deleteService(
        {
            auth: { id: '507f1f77bcf86cd799439011', role: 1 },
            params: { id: 'service-1' },
        },
        response
    );

    assert.equal(saved, true);
    assert.equal(service.isActive, false);
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.removalMode, 'archived');
});
