require('dotenv').config();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET phải được cấu hình trong backend/.env.');
}
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
const utilityRoutes = require('./src/routes/utilityRoutes');
const ocrRoutes = require('./src/routes/ocrRoutes');
const paymentController = require('./src/controllers/paymentController');
const { applyAllOverduePenalties } = require('./src/services/overdueInvoice');
<<<<<<< HEAD
=======
const { startBillingScheduler } = require('./src/services/billingScheduler');
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e

const path = require('path');

const app = express();

// 2. Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' })); // Giúp API đọc được dữ liệu JSON gửi lên, tăng giới hạn lên 50mb
<<<<<<< HEAD
app.use('/public', express.static(path.join(__dirname, 'public')));
=======
app.use('/public/contracts', (_req, res) => res.status(404).json({ success: false, message: 'Tài liệu hợp đồng không được phát hành công khai.' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/api/contracts/assets/pdfjs', express.static(path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'build')));
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e


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

const notificationRoutes = require('./src/routes/notificationRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const adminAccountRoutes = require('./src/routes/adminAccountRoutes');

// 4. Đăng ký các Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/me', meRoute);
app.use('/api/payments', paymentRoute);
app.get('/api/vnpay/ipn', paymentController.vnpayIpn);
app.use('/api/services', serviceRoutes);
app.use('/api/settings/billing-policy', billingPolicyRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/ocr', ocrRoutes);
app.post('/api/cccd/scan', require('./src/controllers/ocrController').scanCCCD);
app.use("/vqr", require("./src/routes/vietqrDirectRoutes"));

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/landlord', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin/accounts', adminAccountRoutes);

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

const http = require('http');
const { initSocket } = require('./src/services/socketService');

const server = http.createServer(app);
initSocket(server);
<<<<<<< HEAD
=======
startBillingScheduler();
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e

// 6. Khởi động Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại http://0.0.0.0:${PORT}`);
});
