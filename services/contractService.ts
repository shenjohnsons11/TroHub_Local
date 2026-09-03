import {
  Contract,
  ContractService,
  ContractStatus,
} from "../types/Contract";
import { apiClient } from "./apiClient";
import { authService } from "./authService";
import { formatCurrency } from "../utils/formatters";

type ApiRoom = {
  _id: string;

  roomCode?: string;

  area?: string;
};

type ApiTenant = {
  _id: string;

  fullName?: string;

  phone?: string;
};

type ApiServiceItem = {
  serviceId?: {
    _id: string;

    name?: string;

    unit?: string;

    type?: number;

    defaultPrice?: number;
  };

  fixedPrice?: number;
};

type ApiContract = {
  _id: string;

  roomId?: ApiRoom;

  tenantId?: ApiTenant;

  startDate: string;

  endDate: string;

  fixedRentPrice: number;

  fixedDeposit: number;

  electricityPrice?: number;

  waterPrice?: number;

  initialElectricity?: number;

  initialWater?: number;

  status: number;

  services?: ApiServiceItem[];

  tenantConfirmedAt?: string;

  docxUrl?: string;

  pdfUrl?: string;

  tenantSignature?: string;

  isAdvanceBooking?: boolean;

  handoverDate?: string;

  checkoutRequestedAt?: string;

  depositPayment?: {
    required: boolean;

    invoiceId: string | null;

    amount: number;

    status:
      | "not_required"
      | "unpaid"
      | "paid";
  };
};

type ContractListResponse = {
  success: boolean;

  data: ApiContract[];

  message?: string;
};

type ContractActionResponse = {
  success: boolean;

  message?: string;

  invoiceId?: string;

  depositRequired?: boolean;

  depositAmount?: number;

  idempotent?: boolean;
};

const formatDate = (
  value?: string,
) => {
  if (!value) {
    return "Không có";
  }

  const date = new Date(
    value,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Không có";
  }

  return date.toLocaleDateString(
    "vi-VN",
  );
};

const getMonthsDiff = (
  start: Date,
  end: Date,
) => {
  return (
    (end.getFullYear() -
      start.getFullYear()) *
      12 +
    (end.getMonth() -
      start.getMonth())
  );
};

const getServicePrice = (
  services: ApiServiceItem[],
  keywords: string[],
) => {
  const found = services.find(
    (item) => {
      const name =
        item.serviceId?.name?.toLowerCase() ||
        "";

      return keywords.some(
        (keyword) =>
          name.includes(
            keyword,
          ),
      );
    },
  );

  return (
    found?.fixedPrice || 0
  );
};

/**
 * Map danh sách dịch vụ API sang Contract.services
 *
 * Chỉ dùng để giữ lại các dịch vụ đã được chủ trọ
 * chọn lúc tạo hợp đồng.
 */
const mapContractServices = (
  services: ApiServiceItem[],
): ContractService[] => {
  return services
    .filter(
      (item) =>
        Boolean(
          item.serviceId?.name,
        ),
    )
    .map((item) => ({
      serviceId:
        item.serviceId?._id,

      name:
        item.serviceId?.name ||
        "Dịch vụ",

      unit:
        item.serviceId?.unit ||
        "",

      fixedPrice:
        item.fixedPrice ??
        item.serviceId
          ?.defaultPrice ??
        0,
    }));
};

const mapNumericStatus = (
  status: number,
): ContractStatus => {
  switch (status) {
    case 0:
      return "pending";

    case 1:
      return "active";

    case 2:
      return "expired";

    case 3:
      return "terminated";

    case 4:
      return "reserved";

    case 5:
      return "pending";

    default:
      return "pending";
  }
};

const mapApiContractToContract = (
  apiContract: ApiContract,
): Contract => {
  const services =
    apiContract.services ||
    [];

  const startDate =
    new Date(
      apiContract.startDate,
    );

  const endDate =
    new Date(
      apiContract.endDate,
    );

  const now =
    new Date();

  const totalMonths =
    Math.max(
      getMonthsDiff(
        startDate,
        endDate,
      ),
      1,
    );

  const usedMonths =
    Math.max(
      getMonthsDiff(
        startDate,
        now,
      ),
      0,
    );

  const remainingMonths =
    Math.max(
      totalMonths -
        usedMonths,
      0,
    );

  const progressNumber =
    Math.min(
      Math.round(
        (usedMonths /
          totalMonths) *
          100,
      ),
      100,
    );

  /*
   * Hỗ trợ dữ liệu legacy:
   * nếu điện/nước cũ nằm trong services thì vẫn lấy.
   */

  const legacyElectricPrice =
    getServicePrice(
      services,
      [
        "điện",
        "dien",
      ],
    );

  const legacyWaterPrice =
    getServicePrice(
      services,
      [
        "nước",
        "nuoc",
      ],
    );

  const electricPrice =
    apiContract.electricityPrice ??
    legacyElectricPrice;

  const waterPrice =
    apiContract.waterPrice ??
    legacyWaterPrice;

  /*
   * Giữ logic cũ cho màn hình ContractScreen.
   */

  const parkingPrice =
    getServicePrice(
      services,
      [
        "xe",
        "parking",
      ],
    );

  const internetPrice =
    getServicePrice(
      services,
      [
        "internet",
        "wifi",
        "mạng",
        "mang",
      ],
    );

  /*
   * Danh sách dịch vụ động.
   */

  const contractServices =
    mapContractServices(
      services,
    );

  return {
    id:
      apiContract._id,

    roomId:
      apiContract.roomId?._id,

    room:
      apiContract.roomId
        ?.roomCode ||
      "N/A",

    tenantName:
      apiContract.tenantId
        ?.fullName ||
      "Người thuê",

    startDate:
      formatDate(
        apiContract.startDate,
      ),

    endDate:
      formatDate(
        apiContract.endDate,
      ),

    rentFee: `${formatCurrency(
      apiContract.fixedRentPrice,
    )} / tháng`,

    deposit:
      formatCurrency(
        apiContract.fixedDeposit,
      ),

    depositPayment:
      apiContract.depositPayment,

    status:
      apiContract.checkoutRequestedAt
        ? "requesting_termination"
        : mapNumericStatus(
            apiContract.status,
          ),

    rawStatus:
      apiContract.status,

    usedMonths,

    remainingMonths,

    progressPercent:
      `${progressNumber}%`,

    /*
     * Giữ nguyên serviceFees cũ.
     */
    serviceFees: {
      electric: `${formatCurrency(
        electricPrice,
      )} / kWh`,

      water: `${formatCurrency(
        waterPrice,
      )} / m³`,

      parking: `${formatCurrency(
        parkingPrice,
      )} / tháng`,

      internet: `${formatCurrency(
        internetPrice,
      )} / tháng`,
    },

    /*
     * THÊM DANH SÁCH DỊCH VỤ ĐỘNG.
     *
     * SignContractWizard sẽ đọc field này.
     */
    services:
      contractServices,

    meterTerms: {
      electricityPrice:
        electricPrice,

      waterPrice,

      initialElectricity:
        apiContract.initialElectricity ??
        0,

      initialWater:
        apiContract.initialWater ??
        0,
    },

    note:
      "Người thuê cần thanh toán tiền phòng trước ngày 05 hằng tháng. Nếu có nhu cầu gia hạn hợp đồng, vui lòng liên hệ chủ trọ trước 30 ngày.",

    docxUrl:
      apiContract.docxUrl,

    pdfUrl:
      apiContract.pdfUrl,

    tenantSignature:
      apiContract.tenantSignature,

    isAdvanceBooking:
      apiContract.isAdvanceBooking,

    handoverDate:
      apiContract.handoverDate,

    checkoutRequestedAt:
      apiContract.checkoutRequestedAt,
  };
};

export const contractService = {
  /*
   * Lấy hợp đồng đang hiệu lực
   * dùng cho giao diện cũ.
   */

  async getContract():
    Promise<Contract | null> {
    try {
      const contracts =
        await this.getMyContracts();

      const activeContract =
        contracts.find(
          (contract) =>
            contract.status ===
            "active",
        ) ||
        contracts[0] ||
        null;

      return activeContract;
    } catch (error) {
      console.log(
        "Lỗi lấy hợp đồng từ API:",
        error,
      );

      return null;
    }
  },

  /*
   * Lấy tất cả hợp đồng của
   * người thuê đang đăng nhập.
   */

  async getMyContracts():
    Promise<Contract[]> {
    try {
      const token =
        await authService.getToken();

      const authUser =
        await authService.getAuthUser();

      if (
        !token ||
        !authUser
      ) {
        throw new Error(
          "Không tìm thấy thông tin đăng nhập",
        );
      }

      const response =
        await apiClient.get<ContractListResponse>(
          "/contracts/my-contracts",
          token,
        );

      if (
        !response.success
      ) {
        throw new Error(
          response.message ||
            "Không lấy được danh sách hợp đồng",
        );
      }

      const contracts =
        response.data ||
        [];

      return contracts.map(
        mapApiContractToContract,
      );
    } catch (error) {
      console.log(
        "Lỗi lấy danh sách hợp đồng:",
        error,
      );

      return [];
    }
  },

  /*
   * Người thuê ký xác nhận hợp đồng
   * status 0 → 4
   * kèm chữ ký Base64.
   */

  async signContract(
    contractId: string,
    signatureBase64?: string,
  ): Promise<{
    success: boolean;

    invoiceId?: string;

    depositRequired: boolean;

    depositAmount: number;

    idempotent: boolean;
  }> {
    try {
      const token =
        await authService.getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token đăng nhập",
        );
      }

      const response =
        await apiClient.patch<ContractActionResponse>(
          `/contracts/${contractId}/sign`,
          {
            signature:
              signatureBase64,
          },
          token,
        );

      if (
        !response.success
      ) {
        throw new Error(
          response.message ||
            "Ký hợp đồng thất bại",
        );
      }

      return {
        success: true,

        invoiceId:
          response.invoiceId,

        depositRequired:
          Boolean(
            response.depositRequired,
          ),

        depositAmount:
          Number(
            response.depositAmount,
          ) || 0,

        idempotent:
          Boolean(
            response.idempotent,
          ),
      };
    } catch (error) {
      console.log(
        "Lỗi ký hợp đồng:",
        error,
      );

      throw error;
    }
  },

  /*
   * Người thuê yêu cầu trả phòng
   * status 1 → 5.
   */

  async requestTerminate(
    contractId: string,
  ): Promise<boolean> {
    try {
      const token =
        await authService.getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token đăng nhập",
        );
      }

      const response =
        await apiClient.put<ContractActionResponse>(
          `/me/request-terminate/${contractId}`,
          {},
          token,
        );

      if (
        !response.success
      ) {
        throw new Error(
          response.message ||
            "Yêu cầu trả phòng thất bại",
        );
      }

      return true;
    } catch (error: any) {
      console.log(
        "Lỗi yêu cầu trả phòng:",
        error,
      );

      throw error;
    }
  },
};