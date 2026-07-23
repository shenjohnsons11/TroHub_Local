const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_OTP_ATTEMPTS = 5;

function validateNewPassword(password) {
    const strongPassword =
        typeof password === 'string'
        && password.length >= 10
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /\d/.test(password)
        && /[^A-Za-z0-9]/.test(password);

    return strongPassword
        ? null
        : {
            code: 'PASSWORD_TOO_WEAK',
            message: 'Mật khẩu phải có ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
        };
}

function createPasswordResetService({
    resetRepository,
    accountRepository,
    sendOtpEmail,
    sendPasswordChangedEmail = async () => {},
    now = () => new Date(),
    randomInt = crypto.randomInt,
    randomBytes = crypto.randomBytes,
}) {
    function createError(code, message) {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    function hashResetToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    return {
        hashResetToken,

        async requestOtp({ account, requestedIp }) {
            const issuedAt = now();
            const latest = await resetRepository.findLatestActive(String(account._id));
            if (
                latest?.createdAt
                && issuedAt.getTime() - new Date(latest.createdAt).getTime() < RESEND_WAIT_MS
            ) {
                throw createError(
                    'OTP_RESEND_TOO_SOON',
                    'Vui lòng chờ 60 giây trước khi yêu cầu mã mới.',
                );
            }

            const recentCount = await resetRepository.countRecent({
                accountId: String(account._id),
                requestedIp,
                since: new Date(issuedAt.getTime() - HOURLY_WINDOW_MS),
            });
            if (recentCount >= MAX_REQUESTS_PER_HOUR) {
                throw createError(
                    'OTP_HOURLY_LIMIT',
                    'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.',
                );
            }

            const otp = String(randomInt(100000, 1000000)).padStart(6, '0');
            const otpHash = await bcrypt.hash(otp, 10);

            await resetRepository.invalidateActive(String(account._id), issuedAt);
            await resetRepository.create({
                accountId: String(account._id),
                otpHash,
                resetTokenHash: null,
                expiresAt: new Date(issuedAt.getTime() + OTP_LIFETIME_MS),
                attemptCount: 0,
                usedAt: null,
                requestedIp,
                createdAt: issuedAt,
            });
            await sendOtpEmail({
                to: account.email,
                fullName: account.fullName,
                otp,
                expiresInMinutes: 10,
            });

            return { delivered: true };
        },

        async verifyOtp({ accountId, otp }) {
            const verifiedAt = now();
            const record = await resetRepository.findLatestActive(String(accountId));
            if (!record || !record.otpHash) {
                throw createError('OTP_INVALID', 'Mã xác minh không hợp lệ.');
            }
            if (record.usedAt) {
                throw createError('OTP_USED', 'Mã xác minh đã được sử dụng.');
            }
            if (new Date(record.expiresAt).getTime() <= verifiedAt.getTime()) {
                throw createError('OTP_EXPIRED', 'Mã xác minh đã hết hạn.');
            }
            if (record.attemptCount >= MAX_OTP_ATTEMPTS) {
                throw createError(
                    'OTP_ATTEMPTS_EXCEEDED',
                    'Mã xác minh đã bị khóa do nhập sai quá nhiều lần.',
                );
            }

            const matches = await bcrypt.compare(String(otp), record.otpHash);
            if (!matches) {
                const updated = await resetRepository.incrementAttempt(record._id);
                if (updated.attemptCount >= MAX_OTP_ATTEMPTS) {
                    throw createError(
                        'OTP_ATTEMPTS_EXCEEDED',
                        'Mã xác minh đã bị khóa do nhập sai quá nhiều lần.',
                    );
                }
                throw createError('OTP_INVALID', 'Mã xác minh không hợp lệ.');
            }

            const resetToken = randomBytes(32).toString('hex');
            await resetRepository.attachResetToken(record._id, {
                otpHash: null,
                resetTokenHash: hashResetToken(resetToken),
                expiresAt: new Date(verifiedAt.getTime() + OTP_LIFETIME_MS),
            });
            return { resetToken };
        },

        async completeReset({ resetToken, newPassword }) {
            const changedAt = now();
            const record = await resetRepository.findByResetTokenHash(
                hashResetToken(String(resetToken || '')),
            );
            if (!record) {
                throw createError('RESET_TOKEN_INVALID', 'Phiên đặt lại mật khẩu không hợp lệ.');
            }
            if (record.usedAt) {
                throw createError('RESET_TOKEN_USED', 'Phiên đặt lại mật khẩu đã được sử dụng.');
            }
            if (new Date(record.expiresAt).getTime() <= changedAt.getTime()) {
                throw createError('RESET_TOKEN_EXPIRED', 'Phiên đặt lại mật khẩu đã hết hạn.');
            }

            const policyError = validateNewPassword(newPassword);
            if (policyError) throw createError(policyError.code, policyError.message);

            const account = await accountRepository.findById(record.accountId);
            if (!account) {
                throw createError('ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.');
            }
            if (await bcrypt.compare(newPassword, account.password)) {
                throw createError(
                    'PASSWORD_REUSED',
                    'Mật khẩu mới không được trùng mật khẩu hiện tại.',
                );
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);
            await accountRepository.updatePassword(record.accountId, passwordHash, changedAt);
            await resetRepository.markUsed(record._id, changedAt);
            await sendPasswordChangedEmail({
                to: account.email,
                fullName: account.fullName,
            });
            return { changed: true };
        },

        async issueTemporaryPassword({ accountId }) {
            const account = await accountRepository.findById(accountId);
            if (!account || account.role !== 2) {
                throw createError(
                    'NGUOI_THUE_NOT_FOUND',
                    'Không tìm thấy tài khoản Người thuê.',
                );
            }
            const entropy = randomBytes(8).toString('base64url').slice(0, 10);
            const temporaryPassword = `Th@${entropy}9A`;
            const passwordHash = await bcrypt.hash(temporaryPassword, 10);
            const changedAt = now();
            await accountRepository.updateTemporaryPassword(
                accountId,
                passwordHash,
                changedAt,
            );
            return { temporaryPassword };
        },
    };
}

function createMongoPasswordResetService() {
    const Account = require('../models/Account');
    const PasswordReset = require('../models/PasswordReset');
    const { buildLoginLookup } = require('./authIdentifier');
    const options = arguments[0] || {};

    const resetRepository = {
        invalidateActive: (accountId, usedAt) => PasswordReset.updateMany(
            { accountId, usedAt: null },
            { $set: { usedAt } },
        ),
        countRecent: ({ accountId, requestedIp, since }) => PasswordReset.countDocuments({
            createdAt: { $gte: since },
            $or: [{ accountId }, { requestedIp }],
        }),
        findLatestActive: (accountId) => PasswordReset
            .findOne({ accountId, usedAt: null })
            .sort({ createdAt: -1 }),
        create: (record) => PasswordReset.create(record),
        incrementAttempt: (recordId) => PasswordReset.findByIdAndUpdate(
            recordId,
            { $inc: { attemptCount: 1 } },
            { new: true },
        ),
        attachResetToken: (recordId, data) => PasswordReset.findByIdAndUpdate(
            recordId,
            { $set: data },
        ),
        findByResetTokenHash: (resetTokenHash) => PasswordReset.findOne({ resetTokenHash }),
        markUsed: (recordId, usedAt) => PasswordReset.findByIdAndUpdate(
            recordId,
            { $set: { usedAt } },
        ),
    };
    const accountRepository = {
        findById: (accountId) => Account.findById(accountId),
        updatePassword: (accountId, password, passwordChangedAt) => Account.findByIdAndUpdate(
            accountId,
            {
                $set: {
                    password,
                    passwordChangedAt,
                    mustChangePassword: false,
                },
            },
        ),
        updateTemporaryPassword: (
            accountId,
            password,
            passwordChangedAt,
        ) => Account.findByIdAndUpdate(
            accountId,
            {
                $set: {
                    password,
                    passwordChangedAt,
                    mustChangePassword: true,
                },
            },
        ),
    };
    const core = createPasswordResetService({
        resetRepository,
        accountRepository,
        sendOtpEmail: options.sendOtpEmail,
        sendPasswordChangedEmail: options.sendPasswordChangedEmail,
    });

    async function findAccount(identifier) {
        const account = await Account.findOne(buildLoginLookup(identifier));
        if (!account) {
            const error = new Error('Không tìm thấy tài khoản.');
            error.code = 'ACCOUNT_NOT_FOUND';
            throw error;
        }
        return account;
    }

    return {
        async requestByIdentifier({ identifier, requestedIp }) {
            const account = await findAccount(identifier);
            if (!account.email) {
                const error = new Error('Tài khoản chưa có email.');
                error.code = 'ACCOUNT_EMAIL_MISSING';
                throw error;
            }
            return core.requestOtp({ account, requestedIp });
        },
        async verifyByIdentifier({ identifier, otp }) {
            const account = await findAccount(identifier);
            return core.verifyOtp({ accountId: account._id, otp });
        },
        completeReset: (payload) => core.completeReset(payload),
        issueTemporaryPassword: (payload) => core.issueTemporaryPassword(payload),
    };
}

module.exports = {
    createPasswordResetService,
    createMongoPasswordResetService,
    validateNewPassword,
};
