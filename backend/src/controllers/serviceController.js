const Contract = require('../models/Contract');
const Service = require('../models/Service');
const ServicePriceAudit = require('../models/ServicePriceAudit');
const {
    ServiceValidationError,
    normalizeServiceInput,
} = require('../services/serviceManagement');
const {
    ServicePricePropagationError,
    applyServicePrice,
    previewServicePriceImpact,
} = require('../services/servicePricePropagation');

function sendControllerError(res, error, fallbackMessage) {
    if (error instanceof ServiceValidationError || error instanceof ServicePricePropagationError) {
        return res.status(error.status || 400).json({
            success: false,
            code: error.code,
            field: error.field,
            message: error.message,
        });
    }

    if (error?.code === 11000) {
        return res.status(409).json({
            success: false,
            code: 'SERVICE_CODE_EXISTS',
            message: 'Mã dịch vụ đã tồn tại.',
        });
    }

    return res.status(500).json({
        success: false,
        code: 'SERVICE_OPERATION_FAILED',
        message: `${fallbackMessage}: ${error.message}`,
    });
}

exports.getAllServices = async (req, res) => {
    try {
        const query = { landlordId: req.auth.id };
        if (req.query.isActive === 'true') query.isActive = true;
        if (req.query.isActive === 'false') query.isActive = false;

        const services = await Service.find(query).sort({ name: 1, createdAt: -1 });
        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách dịch vụ thành công.',
            data: services,
        });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể lấy danh sách dịch vụ');
    }
};

function createPriceDependencies() {
    return {
        getOwnedService: ({ adminId, serviceId }) => Service.findOne({
            _id: serviceId,
            landlordId: adminId,
        }).lean(),
        listEligibleContracts: async ({ adminId, serviceId }) => {
            const contracts = await Contract.find({
                status: 1,
                'services.serviceId': serviceId,
            }).populate({
                path: 'roomId',
                match: { landlordId: adminId },
                select: 'roomCode landlordId',
            }).lean();
            return contracts
                .filter((contract) => contract.roomId)
                .map((contract) => {
                    const snapshot = contract.services.find(
                        (item) => String(item.serviceId) === String(serviceId)
                    );
                    return {
                        contractId: String(contract._id),
                        roomCode: contract.roomId.roomCode,
                        currentPrice: snapshot.fixedPrice,
                    };
                });
        },
        updateCatalogPrice: ({ adminId, serviceId, newPrice }) => Service.updateOne(
            { _id: serviceId, landlordId: adminId },
            { $set: { defaultPrice: newPrice } }
        ),
        updateContractPrice: async ({ adminId, serviceId, contractId, newPrice }) => {
            const contract = await Contract.findById(contractId)
                .populate({ path: 'roomId', match: { landlordId: adminId }, select: '_id' });
            if (!contract?.roomId) {
                throw new ServicePricePropagationError(
                    'INVALID_SERVICE_PRICE_SCOPE',
                    'Hợp đồng không thuộc phạm vi quản lý.'
                );
            }
            const snapshot = contract.services.find(
                (item) => String(item.serviceId) === String(serviceId)
            );
            snapshot.fixedPrice = newPrice;
            return contract.save();
        },
        createAudit: (entry) => ServicePriceAudit.create(entry),
    };
}

exports.previewPriceImpact = async (req, res) => {
    try {
        const data = await previewServicePriceImpact({
            adminId: req.auth.id,
            serviceId: req.params.id,
            newPrice: req.body.newPrice,
        }, createPriceDependencies());
        return res.status(200).json({
            success: true,
            message: 'Đã tính phạm vi ảnh hưởng của đơn giá mới.',
            data,
        });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể xem trước phạm vi giá');
    }
};

exports.applyPrice = async (req, res) => {
    try {
        const data = await applyServicePrice({
            adminId: req.auth.id,
            serviceId: req.params.id,
            newPrice: req.body.newPrice,
            scope: req.body.scope,
            contractIds: req.body.contractIds,
        }, createPriceDependencies());
        return res.status(200).json({
            success: true,
            message: data.contractsUpdated > 0
                ? `Đã cập nhật giá dịch vụ và ${data.contractsUpdated} hợp đồng được chọn.`
                : 'Đã cập nhật giá dịch vụ cho các hợp đồng tạo mới.',
            data,
        });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể cập nhật giá dịch vụ');
    }
};

exports.createService = async (req, res) => {
    try {
        const payload = normalizeServiceInput(req.body);
        const duplicate = await Service.findOne({
            landlordId: req.auth.id,
            code: payload.code,
        });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                code: 'SERVICE_CODE_EXISTS',
                message: 'Mã dịch vụ đã tồn tại.',
            });
        }

        const service = new Service({
            ...payload,
            landlordId: req.auth.id,
        });
        await service.save();

        return res.status(201).json({
            success: true,
            message: 'Tạo dịch vụ mới thành công.',
            data: service,
        });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể tạo dịch vụ');
    }
};

exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findOne({
            _id: req.params.id,
            landlordId: req.auth.id,
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                code: 'SERVICE_NOT_FOUND',
                message: 'Không tìm thấy dịch vụ.',
            });
        }

        return res.status(200).json({ success: true, data: service });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể lấy dịch vụ');
    }
};

exports.updateService = async (req, res) => {
    try {
        const payload = normalizeServiceInput(req.body, { partial: true });
        const service = await Service.findOne({
            _id: req.params.id,
            landlordId: req.auth.id,
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                code: 'SERVICE_NOT_FOUND',
                message: 'Không tìm thấy dịch vụ cần cập nhật.',
            });
        }

        if (payload.code && payload.code !== service.code) {
            const duplicate = await Service.findOne({
                _id: { $ne: service._id },
                landlordId: req.auth.id,
                code: payload.code,
            });
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    code: 'SERVICE_CODE_EXISTS',
                    message: 'Mã dịch vụ đã tồn tại.',
                });
            }
        }

        Object.assign(service, payload);
        await service.save();
        return res.status(200).json({
            success: true,
            message: 'Cập nhật dịch vụ thành công.',
            data: service,
        });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể cập nhật dịch vụ');
    }
};

exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findOne({
            _id: req.params.id,
            landlordId: req.auth.id,
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                code: 'SERVICE_NOT_FOUND',
                message: 'Không tìm thấy dịch vụ cần xóa.',
            });
        }

        const isReferenced = await Contract.exists({
            'services.serviceId': service._id,
        });
        if (isReferenced) {
            service.isActive = false;
            await service.save();
            return res.status(200).json({
                success: true,
                message: 'Dịch vụ đang được sử dụng nên đã chuyển sang ngừng hoạt động.',
                data: { id: service._id, removalMode: 'archived' },
            });
        }

        await Service.deleteOne({
            _id: service._id,
            landlordId: req.auth.id,
        });
        return res.status(200).json({
            success: true,
            message: 'Xóa dịch vụ thành công.',
            data: { id: service._id, removalMode: 'deleted' },
        });
    } catch (error) {
        return sendControllerError(res, error, 'Không thể xóa dịch vụ');
    }
};
