let io = null;
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'trohub_secret_key_2026';

function initSocket(server) {
    try {
        const { Server } = require('socket.io');
        io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        io.use((socket, next) => {
            try {
                const token = socket.handshake.auth?.token;
                const decoded = jwt.verify(token, JWT_SECRET);
                socket.data.userId = decoded.id;
                next();
            } catch (_error) {
                next(new Error('Unauthorized'));
            }
        });

        io.on('connection', (socket) => {
            console.log('[Socket.io] Client connected:', socket.id);
            socket.join(`user_${socket.data.userId}`);

            socket.on('disconnect', () => {
                console.log('[Socket.io] Client disconnected:', socket.id);
            });
        });

        console.log('[Socket.io] Initialized successfully');
    } catch (error) {
        console.error('[Socket.io] Initialization error:', error.message);
    }
    return io;
}

function getIO() {
    return io;
}

module.exports = {
    initSocket,
    getIO,
};
