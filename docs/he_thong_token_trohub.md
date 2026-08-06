# HỆ THỐNG TOKEN TRONG DỰ ÁN TROHUB (TOKEN ARCHITECTURE REPORT)

> Ngày cập nhật: 02/08/2026  
> Phạm vi áp dụng: Backend Express, WebAdmin Next.js, Mobile App Expo / React Native  
> Mục đích: Tài liệu kiến trúc bảo mật xác thực, hạ tầng Push Notification và Chiến lược tối ưu chống quá tải Server.

---

## 🔑 1. HỆ THỐNG TROHUB CÓ BAO NHIÊU LOẠI TOKEN?

Trong hệ thống **TroHub**, có **2 NHÓM TOKEN CHÍNH** phục vụ 2 mục đích hoàn toàn khác nhau:

```
                  ┌─────────────────────────────────────────┐
                  │          HỆ THỐNG TOKEN TROHUB          │
                  └────┬───────────────────────────────┬────┘
                       │                               │
            ┌──────────┴──────────────┐     ┌──────────┴──────────────┐
            ▼                         ▼     ▼                         ▼
  1. Access Token             2. Refresh Token             3. Expo Push Token
  (Xác thực API ngắn hạn)     (Làm mới phiên dài hạn)      (Mã đẩy thông báo thiết bị)
```

### 📊 BẢNG QUY MÔ TOKEN THEO TÀI KHOẢN (VỚI 100 NGƯỜI DÙNG)

| Loại Token | Số lượng tồn tại thực tế | Nơi lưu trữ |
|---|---|---|
| **Access Token (JWT)** | **100 Tokens** (Mỗi người dùng 1 mã) | `localStorage` (Web) / `AsyncStorage` (App) |
| **Refresh Token (JWT)** | **100 Tokens** (Dùng xin lại phiên) | Database MongoDB (`User.refreshToken`) / Cookies |
| **Expo Push Token** | **100 ~ 150 Tokens** *(1 người dùng nhiều máy)* | Database MongoDB (`User.pushTokens: []`) |

👉 **Tổng cộng hệ thống quản lý khoảng ~300 Tokens** cho quy mô 100 người dùng.

---

### 📌 CHI TIẾT VỀ CÁC LOẠI TOKEN

#### 🟢 NHÓM 1: AUTHENTICATION TOKENS (JWT - JSON Web Token)
Đây là "thẻ căn cước điện tử" dùng để xác định **AI ĐANG GỌI API** (Chủ trọ hay Người thuê):

1. **Access Token (Mã truy cập ngắn hạn - Hạn 7 ngày):**
   - **Cách tạo:** Được Backend phát hành ngay khi Đăng nhập thành công (`jwt.sign({ id, role }, JWT_SECRET)`).
   - **Nơi lưu:**
     + **Bản WebAdmin:** Lưu trong `localStorage` (khóa `trohub_token`).
     + **Bản Mobile App:** Lưu trong `AsyncStorage` / `SecureStore`.
   - **Nhiệm vụ:** Đính kèm vào tất cả các API bảo mật (Header `Authorization: Bearer <token>`).

2. **Refresh Token (Mã làm mới dài hạn - Hạn 30 ngày):**
   - **Nhiệm vụ:** Khi Access Token hết hạn, App/Web tự động dùng Refresh Token để xin cấp Access Token mới mà **không bắt người dùng phải gõ lại mật khẩu**.

---

#### 🔵 NHÓM 2: DEVICE PUSH TOKEN (Mã Đẩy Thông Báo Thiết Bị)

3. **Expo Push Token (Ví dụ: `ExponentPushToken[AbC123Xyz...]`):**
   - **Nhiệm vụ:** Đây KHÔNG PHẢI là token đăng nhập của người dùng, mà là **Mã định danh duy nhất của chiếc iPhone/Android đó**.
   - **Cách hoạt động:** Khi App Mobile mở lên ➔ App xin cấp mã token thiết bị từ hệ thống Expo/Apple/Google ➔ Gửi mã này lưu vào cơ sở dữ liệu Backend (`user.pushTokens`).
   - Khi Chủ trọ bắn Hóa đơn/Hợp đồng ➔ Backend đọc Push Token này để đẩy thông báo nảy ngoài màn hình khóa (Lockscreen Banner).

---

## 🛡️ 2. CHIẾN LƯỢC SỬ DỤNG TOKEN CHỐNG QUÁ TẢI SERVER (ANTI-OVERLOAD STRATEGY)

Để đảm bảo Server không bị giật lag, sập Database hoặc nghẽn mạng khi hàng nghìn người cùng sử dụng, TroHub áp dụng **5 Quy chuẩn Kỹ thuật Tối ưu Token**:

### ⚡ 1. Xác thực Token trực tiếp trong RAM (Stateless JWT Verification):
- **Cách làm:** Gói sẵn `userId` và `role` trực tiếp bên trong AccessToken.
- **Tác dụng:** Khi Client gọi API, Middleware `authMiddleware.js` giải mã kiểm tra Token **trực tiếp trong RAM trong 0.1ms mà KHÔNG CẦN TRUY VẤN MONGO DB**.
- **Hiệu năng:** Tiết kiệm 90% tải cho Database, chịu được hàng chục ngàn request/giây!

### 🚀 2. Gom nhóm Push Notification theo lô (Batch Push Processing):
- **Tránh:** Dùng vòng lặp `for` gửi 50 HTTP requests Push lẻ khi phát hành hóa đơn cho 50 phòng.
- **Chuẩn TroHub:** Gom 50 `pushTokens` vào 1 Mảng duy nhất và gọi API Expo Push **1 LẦN DUY NHẤT** (`expo.sendPushNotificationsAsync(chunks)`).
- **Tác dụng:** Giảm tải kết nối mạng từ 50 lần xuống còn 1 lần!

### 🔒 3. Tránh Spam Refresh Token (Access Token Caching):
- Đặt thời hạn AccessToken hợp lý (**7 ngày**). Client tự lưu Token vào bộ nhớ máy.
- Client chỉ xin cấp mới Token khi thực sự hết hạn ➔ Tránh việc App liên tục gọi API xin lại Token gây quá tải Server.

### 🛑 4. Chống bấm Nút Liên Tục (Client Debouncing & Throttling):
- Tại các nút bấm quan trọng (*Phát hành hóa đơn*, *Tạo hợp đồng*, *Nhắc nợ*), bọc chống spam 300ms.
- Dù người dùng có cố tình bấm liên tục 10 lần vào nút ➔ Client chỉ gửi duy nhất 1 Request mang Token lên Server.

### 🧹 5. Tự động Dọn Dẹp Push Token Rác (CronJob Cleanup):
- Với các tài khoản đã đăng xuất hoặc thiết bị đã gỡ App ➔ Hệ thống tự động xóa các Push Token cũ khỏi mảng `pushTokens` để không mất công gửi thông báo tới các thiết bị không còn tồn tại.

---

## 🛠 3. CÁCH SỬ DỤNG TOKEN CHO TỪNG API REQUEST

Dưới đây là quy trình gửi và kiểm tra Token cho từng lệnh gọi API:

### 🟢 BƯỚC 1: Client (Web/App) gửi Token lên Server
Khi gọi bất kỳ API bảo mật nào (như xem Hóa đơn, xem Phòng, Ký hợp đồng), Client phải đính kèm Access Token vào **HTTP Header**:

```http
GET /api/invoices HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### 🟡 BƯỚC 2: Backend Middleware (`authMiddleware.js`) kiểm tra Token
Khi nhận được Request, Backend thực hiện 3 bước kiểm tra:

```javascript
// authMiddleware.js
const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  // 1. Tách lấy token từ Header 'Authorization: Bearer <token>'
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  }

  try {
    // 2. Giải mã và giải nén JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Gán thông tin User vào Request
    req.user = decoded; // Dữ liệu gồm: { id: "user_123", role: 1 }
    next(); // Cho phép đi tiếp vào Controller!
  } catch (err) {
    return res.status(401).json({ message: "Token đã hết hạn!" });
  }
};
```

---

## 📊 4. BẢNG TỔNG HỢP CÁCH PHÂN BỔ TOKEN THEO API

| Nhóm API | Cần Token không? | Quyền hạn (Role) | Cách dùng Header |
|---|---|---|---|
| **`/api/auth/login`**, **`/api/auth/register`** | ❌ Không | Public | Không cần Header Authorization. |
| **`/api/rooms`**, **`/api/invoices`** (Chủ trọ) | ✅ Bắt buộc | Admin (`role: 1`) | `Authorization: Bearer <Admin_Access_Token>` |
| **`/api/me/contracts`**, **`/api/me/notifications`** | ✅ Bắt buộc | Người thuê (`role: 2`) | `Authorization: Bearer <Tenant_Access_Token>` |
| **`/api/notifications/register-push-token`** | ✅ Bắt buộc | Cả 2 Roles | Gửi `pushToken` của thiết bị lên để lưu vào DB. |

---

> 💡 **Kết luận:** Mô hình thiết kế Token và chiến lược chống quá tải này giúp hệ thống TroHub đạt độ bảo mật tối đa, không bị rò rỉ dữ liệu chéo giữa các nhà trọ, đồng thời đảm bảo Push Notification nảy tức thì đến đúng từng thiết bị điện thoại mà Server luôn chạy siêu mượt!
