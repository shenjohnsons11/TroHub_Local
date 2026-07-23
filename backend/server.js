require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/configs/db');

// 1. Import các Routes
const roomRoutes = require('./src/routes/roomRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');
const contractRoutes = require('./src/routes/contractRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const repairRoutes = require('./src/routes/repairRoutes');
const authRoutes = require('./src/routes/authRoutes');
const seedRoute = require('./src/routes/seedRoute');
const settingsRoute = require('./src/routes/settingsRoute');
const meRoute = require('./src/routes/meRoute');
const paymentRoute = require('./src/routes/paymentRoute');
const serviceRoutes = require('./src/routes/serviceRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const billingPolicyRoutes = require('./src/routes/billingPolicyRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const paymentController = require('./src/controllers/paymentController');
const { applyAllOverduePenalties } = require('./src/services/overdueInvoice');

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Giúp API đọc được dữ liệu JSON gửi lên, tăng giới hạn lên 50mb

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`[BACKEND] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});

app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Gọi hàm kết nối Database
connectDB();

const overdueTimer = setInterval(() => {
    applyAllOverduePenalties().catch((error) => {
        console.error('[OVERDUE_INVOICE_JOB] Không thể cập nhật hóa đơn quá hạn:', error.message);
    });
}, 15 * 60 * 1000);
overdueTimer.unref();

// 4. Đăng ký các Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/me', meRoute);
app.use('/api/payments', paymentRoute);
app.get('/api/vnpay/ipn', paymentController.vnpayIpn);
app.use('/api/services', serviceRoutes);
app.use('/api/settings/billing-policy', billingPolicyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/vqr", require("./src/routes/vietqrDirectRoutes"));
app.use('/api/dashboard', dashboardRoutes);

// 5. Global Error Handling (Trả về JSON thay vì HTML)
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Endpoint không tồn tại' });
});

app.use((err, req, res, next) => {
    console.error('[Global Error]', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Lỗi hệ thống nội bộ'
    });
});

// 6. Khởi động Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại http://0.0.0.0:${PORT}`);
});
