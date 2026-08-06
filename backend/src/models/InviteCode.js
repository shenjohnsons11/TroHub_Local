const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        match: /^\d{6}$/,
    },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    usedAt: { type: Date },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
});

module.exports = mongoose.model('InviteCode', inviteCodeSchema);
