const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const DEFAULT_AUTOMATION = {
    autoInvoiceEnabled: true,
    invoiceDay: 25,
    dueDay: 5,
    autoRemindEnabled: true,
    remindDaysBeforeDue: 2,
};

function money(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function idOf(value) {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || value.id || '');
    return String(value);
}

function vietnamYearMonth(now) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: VIETNAM_TIME_ZONE,
        year: 'numeric',
        month: 'numeric',
    }).formatToParts(now);
    return {
        year: Number(parts.find((part) => part.type === 'year')?.value),
        month: Number(parts.find((part) => part.type === 'month')?.value),
    };
}

function buildPeriodRange(now = new Date(), requestedMonths = 6) {
    const months = Math.min(12, Math.max(6, Number(requestedMonths) || 6));
    const current = vietnamYearMonth(now);
    return Array.from({ length: months }, (_, index) => {
        const offset = months - index - 1;
        const date = new Date(Date.UTC(current.year, current.month - 1 - offset, 1));
        const month = date.getUTCMonth() + 1;
        const year = date.getUTCFullYear();
        return {
            period: `${String(month).padStart(2, '0')}/${year}`,
            label: `T${String(month).padStart(2, '0')}`,
        };
    });
}

function normalizePeriod(value) {
    const match = String(value || '').match(/(\d{1,2})\s*\/\s*(\d{4})/);
    if (!match) return '';
    const month = Number(match[1]);
    return month >= 1 && month <= 12 ? `${String(month).padStart(2, '0')}/${match[2]}` : '';
}

function normalizedText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase();
}

function utilityNeedsMeter(contract, utility) {
    const terms = utility === 'electricity' ? ['dien', 'electric'] : ['nuoc', 'water'];
    const service = (contract?.services || []).find((item) => {
        const source = item.serviceId || item;
        const name = normalizedText(`${source?.name || item.serviceName || ''} ${source?.code || item.serviceCode || ''}`);
        return terms.some((term) => name.includes(term));
    });
    if (!service) return true;
    const source = service.serviceId || service;
    const mode = String(service.billingMode || source?.billingMode || '').toUpperCase();
    if (mode) return mode === 'METER';
    return Number(source?.type ?? service.type) === 1;
}

function hasNewReading(draft, previous) {
    const next = Number(draft);
    const last = Number(previous);
    return Number.isFinite(next) && Number.isFinite(last) && next > last;
}

function roomHasCurrentReadings(room, contract) {
    const electricityReady = !utilityNeedsMeter(contract, 'electricity')
        || hasNewReading(room?.draftElectricity, room?.lastElectricityReading);
    const waterReady = !utilityNeedsMeter(contract, 'water')
        || hasNewReading(room?.draftWater, room?.lastWaterReading);
    return {
        ready: electricityReady && waterReady,
        electricityReady,
        waterReady,
    };
}

function isUtilityDetail(detail) {
    const value = normalizedText(`${detail?.serviceName || ''} ${detail?.serviceCode || ''} ${detail?.serviceId?.name || ''}`);
    return ['dien', 'electric', 'nuoc', 'water'].some((term) => value.includes(term));
}

function classifyInvoiceRevenue(invoice) {
    let utilities = 0;
    let services = 0;
    if (Array.isArray(invoice?.details) && invoice.details.length > 0) {
        for (const detail of invoice.details) {
            if (isUtilityDetail(detail)) utilities += money(detail.amount);
            else services += money(detail.amount);
        }
    } else {
        utilities = money(invoice?.electricity) + money(invoice?.water);
        services = money(invoice?.services)
            + money(invoice?.parking)
            + money(invoice?.internet)
            + money(invoice?.garbage);
    }
    const total = money(invoice?.totalAmount);
    return {
        rent: Math.max(0, total - utilities - services),
        utilities,
        services,
    };
}

function invoiceUsage(invoice) {
    return {
        electricity: Math.max(0, money(invoice?.electricityNew) - money(invoice?.electricityOld)),
        water: Math.max(0, money(invoice?.waterNew) - money(invoice?.waterOld)),
    };
}

async function buildDashboardStats({ landlordId, months = 6, now = new Date() }, dependencies) {
    if (!landlordId) throw new Error('landlordId is required');
    const periods = buildPeriodRange(now, months);
    const [rooms, contracts, invoices, totalTenants, pendingRepairs, storedPolicy] = await Promise.all([
        dependencies.listRooms(landlordId),
        dependencies.listContracts(landlordId),
        dependencies.listInvoices(landlordId),
        dependencies.countTenants(landlordId),
        dependencies.countPendingRepairs(landlordId),
        dependencies.getBillingPolicy(landlordId),
    ]);

    const periodSet = new Set(periods.map((item) => item.period));
    const currentPeriod = periods.at(-1).period;
    const paidInvoices = invoices.filter((invoice) => Number(invoice.status) === 2);
    const currentPaidInvoices = paidInvoices.filter((invoice) => normalizePeriod(invoice.period) === currentPeriod);
    const activeContractsByRoom = new Map(
        contracts
            .filter((contract) => Number(contract.status) === 1)
            .map((contract) => [idOf(contract.roomId), contract])
    );

    const revenueByPeriod = new Map(periods.map((item) => [item.period, 0]));
    const utilityByPeriod = new Map(periods.map((item) => [item.period, { electricity: 0, water: 0 }]));
    for (const invoice of paidInvoices) {
        const period = normalizePeriod(invoice.period);
        if (!periodSet.has(period)) continue;
        revenueByPeriod.set(period, revenueByPeriod.get(period) + money(invoice.totalAmount));
        const usage = invoiceUsage(invoice);
        const current = utilityByPeriod.get(period);
        current.electricity += usage.electricity;
        current.water += usage.water;
    }

    const revenueComposition = currentPaidInvoices.reduce((totals, invoice) => {
        const classified = classifyInvoiceRevenue(invoice);
        totals.rent += classified.rent;
        totals.utilities += classified.utilities;
        totals.services += classified.services;
        return totals;
    }, { rent: 0, utilities: 0, services: 0 });

    const paidWithDates = paidInvoices.filter((invoice) => invoice.dueDate && invoice.updatedAt);
    const onTimePaid = paidWithDates.filter((invoice) => new Date(invoice.updatedAt) <= new Date(invoice.dueDate)).length;
    const occupiedRooms = rooms.filter((room) => Number(room.status) === 1);
    const readingStates = occupiedRooms.map((room) => ({
        room,
        state: roomHasCurrentReadings(room, activeContractsByRoom.get(idOf(room._id))),
    }));

    const floorMap = new Map();
    for (const room of [...rooms].sort((left, right) => {
        const floorDifference = money(left.floor || 1) - money(right.floor || 1);
        return floorDifference || String(left.roomCode || '').localeCompare(String(right.roomCode || ''), 'vi');
    })) {
        const floor = Math.max(1, Math.trunc(money(room.floor || 1)));
        const contract = activeContractsByRoom.get(idOf(room._id));
        const reading = roomHasCurrentReadings(room, contract);
        const tenant = contract?.tenantId && typeof contract.tenantId === 'object' ? contract.tenantId : null;
        if (!floorMap.has(floor)) floorMap.set(floor, []);
        floorMap.get(floor).push({
            id: idOf(room._id),
            roomCode: room.roomCode || '',
            floor,
            status: Number(room.status) || 0,
            contractId: idOf(contract?._id),
            tenantId: idOf(contract?.tenantId),
            tenantName: tenant?.fullName || '',
            hasActiveContract: Boolean(contract),
            meterReady: Number(room.status) === 1 ? reading.ready : false,
            missingMeters: Number(room.status) === 1
                ? [!reading.electricityReady ? 'electricity' : null, !reading.waterReady ? 'water' : null].filter(Boolean)
                : [],
        });
    }

    const unpaidInvoices = invoices.filter((invoice) => [1, 3].includes(Number(invoice.status)));
    const missingRoomCodes = readingStates
        .filter(({ state }) => !state.ready)
        .map(({ room }) => room.roomCode)
        .sort((left, right) => String(left).localeCompare(String(right), 'vi'));
    const automation = { ...DEFAULT_AUTOMATION, ...(storedPolicy || {}), issueTime: '07:00' };
    const readyRooms = readingStates.length - missingRoomCodes.length;

    return {
        totalRooms: rooms.length,
        occupiedRooms: occupiedRooms.length,
        vacantRooms: rooms.filter((room) => Number(room.status) === 0).length,
        maintenanceRooms: rooms.filter((room) => Number(room.status) === 2).length,
        totalTenants: Number(totalTenants) || 0,
        pendingRepairs: Number(pendingRepairs) || 0,
        pendingContracts: contracts.filter((contract) => [0, 4, 5].includes(Number(contract.status))).length,
        totalRevenue: currentPaidInvoices.reduce((sum, invoice) => sum + money(invoice.totalAmount), 0),
        outstandingDebt: unpaidInvoices.reduce((sum, invoice) => sum + money(invoice.totalAmount), 0),
        overdueDebt: invoices
            .filter((invoice) => Number(invoice.status) === 3)
            .reduce((sum, invoice) => sum + money(invoice.totalAmount), 0),
        revenueSeries: periods.map((item) => ({ ...item, value: revenueByPeriod.get(item.period) })),
        utilitySeries: periods.map((item) => ({ ...item, ...utilityByPeriod.get(item.period) })),
        revenueComposition,
        paymentPerformance: {
            paid: paidInvoices.length,
            unpaid: invoices.filter((invoice) => Number(invoice.status) === 1).length,
            overdue: invoices.filter((invoice) => Number(invoice.status) === 3).length,
            onTimeRate: paidWithDates.length ? Math.round((onTimePaid / paidWithDates.length) * 100) : 0,
        },
        utilityReading: {
            readyRooms,
            missingRooms: missingRoomCodes.length,
            totalOccupiedRooms: occupiedRooms.length,
            missingRoomCodes,
        },
        utilityReadingProgress: `${readyRooms}/${occupiedRooms.length}`,
        automation,
        floorGroups: [...floorMap.entries()].map(([floor, floorRooms]) => ({ floor, rooms: floorRooms })),
    };
}

module.exports = {
    buildDashboardStats,
    buildPeriodRange,
    classifyInvoiceRevenue,
    normalizePeriod,
    roomHasCurrentReadings,
};
