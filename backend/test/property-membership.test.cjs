const assert = require('node:assert/strict');
const test = require('node:test');

test('property membership schemas define ownership and per-property room codes', () => {
    const Property = require('../src/models/Property');
    const PropertyMembership = require('../src/models/PropertyMembership');
    const Room = require('../src/models/Room');

    assert.equal(Property.schema.path('ownerId').options.required, true);
    assert.ok(PropertyMembership.schema.indexes().some(([keys]) => (
        keys.propertyId === 1 && keys.tenantId === 1
    )));
    assert.ok(Room.schema.indexes().some(([keys]) => (
        keys.propertyId === 1 && keys.roomCode === 1
    )));
});

test('only an active member can receive an open contract in an owned vacant room', async () => {
    const {
        OPEN_CONTRACT_STATUSES,
        assertContractEligibility,
    } = require('../src/services/propertyMembershipService');

    await assertContractEligibility({
        propertyId: 'property-a',
        landlordId: 'landlord-a',
        roomId: 'room-a',
        tenantId: 'tenant-a',
        PropertyModel: { exists: async (query) => query._id === 'property-a' && query.ownerId === 'landlord-a' },
        RoomModel: {
            findOne: async () => ({ _id: 'room-a', propertyId: 'property-a', status: 0 }),
            find: () => ({ distinct: async () => ['room-a'] }),
        },
        MembershipModel: { exists: async (query) => query.status === 'active' },
        ContractModel: { exists: async () => false },
    });

    assert.deepEqual(OPEN_CONTRACT_STATUSES, [0, 1, 4, 5]);
});

test('a room from another property is rejected before a contract is created', async () => {
    const {
        assertContractEligibility,
        PropertyMembershipError,
    } = require('../src/services/propertyMembershipService');

    await assert.rejects(
        assertContractEligibility({
            propertyId: 'property-a',
            landlordId: 'landlord-a',
            roomId: 'room-b',
            tenantId: 'tenant-a',
            PropertyModel: { exists: async () => true },
            RoomModel: { findOne: async () => null, find: () => ({ distinct: async () => [] }) },
            MembershipModel: { exists: async () => true },
            ContractModel: { exists: async () => false },
        }),
        (error) => error instanceof PropertyMembershipError && error.status === 404 && error.code === 'ROOM_NOT_IN_PROPERTY',
    );
});

test('accepting an invitation activates the membership once', async () => {
    const { acceptMembership } = require('../src/services/propertyMembershipService');
    let saveCount = 0;
    const membership = {
        tenantId: 'tenant-a',
        status: 'invited',
        joinedAt: null,
        save: async () => { saveCount += 1; },
    };
    const now = new Date('2026-08-07T00:00:00.000Z');

    await acceptMembership({ membership, tenantId: 'tenant-a', now });
    await acceptMembership({ membership, tenantId: 'tenant-a', now });

    assert.equal(membership.status, 'active');
    assert.equal(membership.joinedAt.toISOString(), now.toISOString());
    assert.equal(saveCount, 1);
});

test('inviting a tenant creates membership without creating a contract', async () => {
    const { createOrInviteTenant } = require('../src/services/tenantLinkService');
    const created = [];
    const memberships = [];
    const result = await createOrInviteTenant({
        propertyId: 'property-a',
        landlordId: 'landlord-a',
        propertyName: 'Nhà A',
        fullName: 'Tenant A',
        phone: '0900000000',
        email: 'tenant-a@example.com',
        idCard: '012345678901',
    }, {
        AccountModel: {
            find: async () => [],
            create: async (data) => {
                const tenant = { _id: 'tenant-a', ...data };
                created.push(tenant);
                return tenant;
            },
        },
        MembershipModel: {
            findOne: async () => null,
            create: async (data) => {
                const membership = { _id: 'membership-a', ...data };
                memberships.push(membership);
                return membership;
            },
        },
        hashPassword: async () => 'hash',
        notify: async () => undefined,
    });

    assert.equal(result.membership.status, 'invited');
    assert.equal(created.length, 1);
    assert.equal(memberships.length, 1);
    assert.equal('contract' in result, false);
});
