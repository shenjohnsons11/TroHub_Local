const { buildTenantDashboard } = require('../services/tenantDashboardService');

exports.getDashboard = async (req, res) => {
    try {
        const data = await buildTenantDashboard(req.auth.id);
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, code: 'TENANT_DASHBOARD_FAILED', message: `Không thể tải trang chủ: ${error.message}` });
    }
};
