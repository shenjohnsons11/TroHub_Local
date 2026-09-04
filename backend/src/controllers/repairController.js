const RepairRequest = require("../models/RepairRequest");
const Contract = require("../models/Contract");
const Room = require("../models/Room");

const {
  sendNotification,
} = require("../services/notificationService");

const {
  notifyLandlord,
} = require("../services/landlordNotificationService");

/* =========================================================
   HELPER
========================================================= */

const STATUS_NAMES = {
  0: "Chờ tiếp nhận",
  1: "Đang xử lý",
  2: "Đã hoàn thành",
  3: "Đã hủy",
};

const PRIORITY_NAMES = {
  0: "Chưa phân loại",
  1: "Thấp",
  2: "Trung bình",
  3: "Cao",
};

function parseStatus(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value <= 3
      ? value
      : null;
  }

  const text = String(value).trim();

  const map = {
    "Mới": 0,
    "Chờ tiếp nhận": 0,
    "Chờ xác nhận": 0,
    pending: 0,

    "Đang xử lý": 1,
    processing: 1,

    "Hoàn thành": 2,
    "Đã hoàn thành": 2,
    completed: 2,
    done: 2,

    "Hủy": 3,
    "Đã hủy": 3,
    cancelled: 3,
    canceled: 3,
  };

  if (map[text] !== undefined) {
    return map[text];
  }

  const parsed = Number(text);

  if (
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= 3
  ) {
    return parsed;
  }

  return null;
}

function parsePriority(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value <= 3
      ? value
      : null;
  }

  const text = String(value).trim();

  const map = {
    "Chưa phân loại": 0,
    "Thấp": 1,

    "Vừa": 2,
    "Trung bình": 2,

    "Cao": 3,
    "Gấp": 3,
  };

  if (map[text] !== undefined) {
    return map[text];
  }

  const parsed = Number(text);

  if (
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= 3
  ) {
    return parsed;
  }

  return null;
}

function parseNonNegativeAmount(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round(number);
}

function parseScheduledAt(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (typeof image === "string") {
        return image;
      }

      if (image && typeof image === "object") {
        return image.fileUrl || image.url || "";
      }

      return "";
    })
    .filter(Boolean)
    .slice(0, 5);
}

function serializeRepair(request) {
  const tenant =
    request.tenantId &&
    typeof request.tenantId === "object"
      ? request.tenantId
      : null;

  const contract =
    request.contractId &&
    typeof request.contractId === "object"
      ? request.contractId
      : null;

  const room =
    contract?.roomId &&
    typeof contract.roomId === "object"
      ? contract.roomId
      : null;

  const roomCode = room?.roomCode || "-";
  const tenantName = tenant?.fullName || "-";

  return {
    _id: request._id,
    id: request._id,

    repairCode: request._id
      ? request._id.toString().slice(-6).toUpperCase()
      : "",

    tenantId: tenant || request.tenantId,
    contractId: contract || request.contractId,

    roomId: room?._id || null,

    // Giữ cả 2 field để App/Web cũ vẫn chạy
    room: roomCode,
    roomCode,

    sender: tenantName,
    tenantName,

    tenantPhone: tenant?.phone || "",

    title: request.title || "",
    content: request.content || "",

    // Alias cho frontend cũ
    description: request.content || "",

    priority: request.priority ?? 0,
    priorityLabel:
      PRIORITY_NAMES[request.priority ?? 0] ||
      "Chưa phân loại",

    status: request.status ?? 0,
    statusLabel:
      STATUS_NAMES[request.status ?? 0] ||
      "Chờ tiếp nhận",

    landlordNote: request.landlordNote || "",

    scheduledAt: request.scheduledAt || null,

    estimatedCost: request.estimatedCost || 0,
    actualCost: request.actualCost || 0,

    // Alias cho web cũ
    cost: request.actualCost || 0,

    completedAt: request.completedAt || null,

    images: Array.isArray(request.images)
      ? request.images
      : [],

    createdAt: request.createdAt,
    updatedAt: request.updatedAt,

    // Alias để web cũ không còn hiện "-"
    date: request.createdAt,
  };
}

async function populateRepairById(id) {
  return RepairRequest.findById(id)
    .populate("tenantId", "_id fullName phone email")
    .populate({
      path: "contractId",
      populate: {
        path: "roomId",
        select: "_id roomCode landlordId",
      },
    });
}

async function getLandlordContractIds(landlordId) {
  const rooms = await Room.find({
    landlordId,
  }).select("_id");

  const roomIds = rooms.map((room) => room._id);

  if (!roomIds.length) {
    return [];
  }

  const contracts = await Contract.find({
    roomId: {
      $in: roomIds,
    },
  }).select("_id");

  return contracts.map((contract) => contract._id);
}

async function landlordOwnsRepair(
  landlordId,
  repair
) {
  if (!landlordId || !repair) {
    return false;
  }

  const contract =
    repair.contractId &&
    typeof repair.contractId === "object"
      ? repair.contractId
      : await Contract.findById(
          repair.contractId
        ).populate(
          "roomId",
          "landlordId"
        );

  const room = contract?.roomId;

  if (!room) {
    return false;
  }

  let roomLandlordId = null;

  if (
    typeof room === "object" &&
    room.landlordId
  ) {
    roomLandlordId =
      room.landlordId._id ||
      room.landlordId;
  } else {
    const roomDocument =
      await Room.findById(
        room
      ).select("landlordId");

    roomLandlordId =
      roomDocument?.landlordId;
  }

  return (
    roomLandlordId &&
    String(roomLandlordId) ===
      String(landlordId)
  );
}

/* =========================================================
   1. CHỦ TRỌ - LẤY TOÀN BỘ YÊU CẦU
========================================================= */

exports.getAllRequests = async (req, res) => {
  try {
    const landlordId = req.auth?.id;

    if (!landlordId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập.",
      });
    }

    const contractIds =
      await getLandlordContractIds(
        landlordId
      );

    const requests =
      await RepairRequest.find({
        contractId: {
          $in: contractIds,
        },
      })
        .populate(
          "tenantId",
          "_id fullName phone email"
        )
        .populate({
          path: "contractId",
          populate: {
            path: "roomId",
            select:
              "_id roomCode landlordId",
          },
        })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      data: requests.map(
        serializeRepair
      ),
    });
  } catch (error) {
    console.error(
      "[getAllRequests]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Lỗi Server: " +
        error.message,
    });
  }
};

/* =========================================================
   2. NGƯỜI THUÊ - LẤY YÊU CẦU CỦA MÌNH
========================================================= */

exports.getMyRequests = async (req, res) => {
  try {
    const tenantId = req.auth?.id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập.",
      });
    }

    const requests =
      await RepairRequest.find({
        tenantId,
      })
        .populate(
          "tenantId",
          "_id fullName phone"
        )
        .populate({
          path: "contractId",
          populate: {
            path: "roomId",
            select: "_id roomCode",
          },
        })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      data: requests.map(
        serializeRepair
      ),
    });
  } catch (error) {
    console.error(
      "[getMyRequests]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không lấy được yêu cầu sửa chữa: " +
        error.message,
    });
  }
};

/* =========================================================
   3. NGƯỜI THUÊ - TẠO YÊU CẦU
========================================================= */

exports.createRequest = async (req, res) => {
  try {
    const tenantId = req.auth?.id;

    const {
      title,
      content,
      priority,
      roomId,
    } = req.body;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message:
          "Không tìm thấy thông tin người thuê đăng nhập!",
      });
    }

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tiêu đề báo cáo sự cố không được để trống!",
      });
    }

    if (
      !content ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nội dung báo cáo sự cố không được để trống!",
      });
    }

    if (content.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message:
          "Mô tả sự cố phải có ít nhất 10 ký tự.",
      });
    }

    const priorityNum =
      parsePriority(priority);

    if (priorityNum === null) {
      return res.status(400).json({
        success: false,
        message:
          "Mức độ ưu tiên không hợp lệ.",
      });
    }

    const contractQuery = {
      tenantId,
      status: 1,
    };

    // Nếu người thuê có nhiều phòng,
    // phải lấy đúng phòng được chọn.
    if (roomId) {
      contractQuery.roomId = roomId;
    }

    const activeContract =
      await Contract.findOne(
        contractQuery
      )
        .populate(
          "roomId",
          "_id roomCode"
        )
        .sort({
          createdAt: -1,
        });

    if (!activeContract) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn không có hợp đồng đang hiệu lực cho phòng này để báo cáo sự cố!",
      });
    }

    const images =
      normalizeImages(
        req.body.images
      );

    const newRequest =
      new RepairRequest({
        tenantId,

        contractId:
          activeContract._id,

        title: title.trim(),

        content:
          content.trim(),

        priority:
          priorityNum ?? 0,

        status: 0,

        landlordNote: "",

        scheduledAt: null,

        estimatedCost: 0,

        actualCost: 0,

        images,
      });

    await newRequest.save();

    await notifyLandlord({
      event: "repair_created",
      contractId:
        activeContract._id,
      entityId:
        newRequest._id,
    });

    const populated =
      await populateRepairById(
        newRequest._id
      );

    return res.status(201).json({
      success: true,
      message:
        "Gửi báo cáo sự cố thành công!",
      data: serializeRepair(
        populated
      ),
    });
  } catch (error) {
    console.error(
      "[createRequest]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Lỗi khi gửi yêu cầu: " +
        error.message,
    });
  }
};

/* =========================================================
   4. CHỦ TRỌ - CẬP NHẬT YÊU CẦU
========================================================= */

exports.updateRequestStatus = async (
  req,
  res
) => {
  try {
    const landlordId = req.auth?.id;

    if (!landlordId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập.",
      });
    }

    const currentRequest =
      await populateRepairById(
        req.params.id
      );

    if (!currentRequest) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy yêu cầu sửa chữa này!",
      });
    }

    const hasPermission =
      await landlordOwnsRepair(
        landlordId,
        currentRequest
      );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền cập nhật yêu cầu sửa chữa này.",
      });
    }

    const {
      status,
      priority,
      note,
      landlordNote,
      scheduledAt,
      estimatedCost,
      actualCost,
    } = req.body;

    const statusNum =
      parseStatus(status);

    const priorityNum =
      parsePriority(priority);

    if (statusNum === null) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ.",
      });
    }

    if (priorityNum === null) {
      return res.status(400).json({
        success: false,
        message:
          "Mức độ ưu tiên không hợp lệ.",
      });
    }

    const parsedEstimatedCost =
      parseNonNegativeAmount(
        estimatedCost
      );

    const parsedActualCost =
      parseNonNegativeAmount(
        actualCost
      );

    if (
      parsedEstimatedCost === null ||
      parsedActualCost === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Chi phí sửa chữa không hợp lệ.",
      });
    }

    let parsedScheduledAt;

    if (
      scheduledAt !== undefined
    ) {
      if (
        scheduledAt === null ||
        scheduledAt === ""
      ) {
        parsedScheduledAt = null;
      } else {
        parsedScheduledAt =
          new Date(scheduledAt);

        if (
          Number.isNaN(
            parsedScheduledAt.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Ngày hẹn sửa chữa không hợp lệ.",
          });
        }
      }
    }

    const updateData = {};

    if (
      statusNum !== undefined
    ) {
      updateData.status =
        statusNum;

      if (statusNum === 2) {
        updateData.completedAt =
          new Date();
      } else {
        updateData.completedAt =
          null;
      }
    }

    if (
      priorityNum !== undefined
    ) {
      updateData.priority =
        priorityNum;
    }

    // Hỗ trợ cả note cũ
    // và landlordNote mới.
    if (
      landlordNote !== undefined
    ) {
      updateData.landlordNote =
        String(
          landlordNote || ""
        ).trim();
    } else if (
      note !== undefined
    ) {
      updateData.landlordNote =
        String(note || "").trim();
    }

    if (
      parsedScheduledAt !==
      undefined
    ) {
      updateData.scheduledAt =
        parsedScheduledAt;
    }

    if (
      parsedEstimatedCost !==
      undefined
    ) {
      updateData.estimatedCost =
        parsedEstimatedCost;
    }

    if (
      parsedActualCost !==
      undefined
    ) {
      updateData.actualCost =
        parsedActualCost;
    }

    const updatedRequest =
      await RepairRequest.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    const populated =
      await populateRepairById(
        updatedRequest._id
      );

    if (populated?.tenantId) {
      const roomCode =
        populated.contractId
          ?.roomId?.roomCode ||
        "-";

      const statusText =
        STATUS_NAMES[
          populated.status
        ] ||
        "Đang cập nhật";

      const title =
        populated.title ||
        "Sự cố sửa chữa";

      let extraText = "";

      if (
        populated.scheduledAt
      ) {
        extraText += ` Lịch hẹn: ${new Date(
          populated.scheduledAt
        ).toLocaleString(
          "vi-VN"
        )}.`;
      }

      if (
        populated.landlordNote
      ) {
        extraText += ` Phản hồi: ${populated.landlordNote}.`;
      }

      await sendNotification({
        userId:
          populated.tenantId
            ._id ||
          populated.tenantId,

        title:
          "Cập nhật tiến độ sửa chữa",

        content:
          `Yêu cầu "${title}" ` +
          `(Phòng ${roomCode}) đã được cập nhật: ${statusText}.` +
          extraText,

        category: "repair",

        deepLink: "repair",

        metadata: {
          repairId:
            populated._id,

          status:
            populated.status,

          statusText,

          note:
            populated.landlordNote ||
            "",

          scheduledAt:
            populated.scheduledAt ||
            null,

          actualCost:
            populated.actualCost ||
            0,
        },

        eventKey:
          `repair:${populated._id}:progress:` +
          Date.now(),
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật tiến độ xử lý thành công!",
      data: serializeRepair(
        populated
      ),
    });
  } catch (error) {
    console.error(
      "[updateRequestStatus]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Lỗi khi cập nhật: " +
        error.message,
    });
  }
};

/* =========================================================
   5. CHỦ TRỌ - XÓA YÊU CẦU
========================================================= */

exports.deleteRequest = async (
  req,
  res
) => {
  try {
    const landlordId = req.auth?.id;

    const request =
      await populateRepairById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy yêu cầu sửa chữa này!",
      });
    }

    const hasPermission =
      await landlordOwnsRepair(
        landlordId,
        request
      );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền xóa yêu cầu này.",
      });
    }

    await RepairRequest.findByIdAndDelete(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message:
        "Đã xóa yêu cầu sửa chữa thành công!",
    });
  } catch (error) {
    console.error(
      "[deleteRequest]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Lỗi khi xóa: " +
        error.message,
    });
  }
};

/* =========================================================
   6. NGƯỜI THUÊ - XÓA YÊU CẦU CỦA MÌNH
========================================================= */

exports.deleteMyRequest = async (
  req,
  res
) => {
  try {
    const tenantId = req.auth?.id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập.",
      });
    }

    const request =
      await RepairRequest.findOne({
        _id: req.params.id,
        tenantId,
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy yêu cầu sửa chữa.",
      });
    }

    // Chỉ được xóa khi chủ trọ chưa tiếp nhận
    if (request.status !== 0) {
      return res.status(400).json({
        success: false,
        message:
          "Yêu cầu đã được chủ trọ tiếp nhận nên không thể xóa.",
      });
    }

    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Đã xóa yêu cầu sửa chữa.",
    });
  } catch (error) {
    console.error(
      "[deleteMyRequest]",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể xóa yêu cầu: " +
        error.message,
    });
  }
};