class ServicePricePropagationError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.name = 'ServicePricePropagationError';
        this.code = code;
        this.status = status;
    }
}

function normalizePrice(value) {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
        throw new ServicePricePropagationError(
            'INVALID_SERVICE_PRICE',
            'Đơn giá dịch vụ phải là số hữu hạn không âm.'
        );
    }
    return Math.round(price);
}

async function previewServicePriceImpact(input, dependencies) {
    const newPrice = normalizePrice(input.newPrice);
    const service = await dependencies.getOwnedService({
        adminId: input.adminId,
        serviceId: input.serviceId,
    });
    if (!service) {
        throw new ServicePricePropagationError(
            'SERVICE_NOT_FOUND',
            'Không tìm thấy dịch vụ.',
            404
        );
    }

    const contracts = await dependencies.listEligibleContracts({
        adminId: input.adminId,
        serviceId: input.serviceId,
    });
    return {
        serviceId: String(service._id),
        currentPrice: Number(service.defaultPrice),
        newPrice,
        contracts: contracts.map((contract) => ({
            contractId: String(contract.contractId),
            roomCode: contract.roomCode,
            currentPrice: Number(contract.currentPrice),
            newPrice,
        })),
    };
}

async function applyServicePrice(input, dependencies) {
    const allowedScopes = ['NEW_CONTRACTS_ONLY', 'SELECTED_ACTIVE_CONTRACTS'];
    if (!allowedScopes.includes(input.scope)) {
        throw new ServicePricePropagationError(
            'INVALID_SERVICE_PRICE_SCOPE',
            'Phạm vi cập nhật giá dịch vụ không hợp lệ.'
        );
    }

    const preview = await previewServicePriceImpact(input, dependencies);
    let selected = [];
    if (input.scope === 'SELECTED_ACTIVE_CONTRACTS') {
        const selectedIds = [...new Set((input.contractIds || []).map(String))];
        const eligible = new Map(preview.contracts.map((item) => [item.contractId, item]));
        if (
            selectedIds.length === 0
            || selectedIds.some((contractId) => !eligible.has(contractId))
        ) {
            throw new ServicePricePropagationError(
                'INVALID_SERVICE_PRICE_SCOPE',
                'Danh sách hợp đồng được chọn không thuộc phạm vi cập nhật.'
            );
        }
        selected = selectedIds.map((contractId) => eligible.get(contractId));
    }

    await dependencies.updateCatalogPrice({
        adminId: input.adminId,
        serviceId: input.serviceId,
        newPrice: preview.newPrice,
    });
    for (const contract of selected) {
        await dependencies.updateContractPrice({
            adminId: input.adminId,
            serviceId: input.serviceId,
            contractId: contract.contractId,
            newPrice: preview.newPrice,
        });
        await dependencies.createAudit({
            adminId: input.adminId,
            serviceId: input.serviceId,
            contractId: contract.contractId,
            oldPrice: contract.currentPrice,
            newPrice: preview.newPrice,
        });
    }

    return {
        scope: input.scope,
        catalogUpdated: true,
        contractsUpdated: selected.length,
    };
}

module.exports = {
    ServicePricePropagationError,
    applyServicePrice,
    previewServicePriceImpact,
};
