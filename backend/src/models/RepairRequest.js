const mongoose = require("mongoose");

const repairRequestSchema = new mongoose.Schema(
  {
    // Người thuê gửi yêu cầu
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    // Hợp đồng tại thời điểm gửi yêu cầu
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      index: true,
    },

    // Tên sự cố
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Nội dung mô tả
    content: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * 0 = Chưa phân loại
     * 1 = Thấp
     * 2 = Trung bình
     * 3 = Cao / Gấp
     */
    priority: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
    },

    /**
     * 0 = Chờ tiếp nhận
     * 1 = Đang xử lý
     * 2 = Đã hoàn thành
     * 3 = Đã hủy
     */
    status: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
      index: true,
    },

    // Phản hồi / ghi chú từ chủ trọ
    landlordNote: {
      type: String,
      default: "",
      trim: true,
    },

    // Ngày giờ dự kiến sửa
    scheduledAt: {
      type: Date,
      default: null,
    },

    // Chi phí dự kiến
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Chi phí thực tế sau khi sửa
    actualCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Thời điểm hoàn thành
    completedAt: {
      type: Date,
      default: null,
    },

    // Ảnh minh chứng người thuê gửi
    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

repairRequestSchema.index({
  contractId: 1,
  status: 1,
  createdAt: -1,
});

repairRequestSchema.index({
  tenantId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("RepairRequest", repairRequestSchema);