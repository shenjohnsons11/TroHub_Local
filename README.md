# TroHub - Ứng dụng Quản lý Phòng trọ (Mobile & Web)

TroHub là ứng dụng đa nền tảng được xây dựng bằng React Native (thông qua Expo Router), cho phép Chủ trọ quản lý các phòng cho thuê và Người thuê theo dõi hợp đồng, hóa đơn, cũng như báo cáo sự cố.

## Tính năng chính
- **Dành cho Chủ trọ (Admin)**: Quản lý danh sách phòng, người thuê, tạo/duyệt hợp đồng, lập hóa đơn, quản lý yêu cầu sửa chữa.
- **Dành cho Người thuê**: Xem thông tin hợp đồng đang thuê, thanh toán hóa đơn, theo dõi lịch sử thanh toán, gửi báo cáo sửa chữa.

## Công nghệ & Thư viện sử dụng
- **Khung ứng dụng**: [Expo SDK 54](https://expo.dev/)
- **UI & Core**: React Native (v0.81), TypeScript
- **Điều hướng**: `expo-router` (File-based routing) & `@react-navigation/native`
- **Lưu trữ dữ liệu tạm thời**: `@react-native-async-storage/async-storage`
- **Icon**: `@expo/vector-icons`

## Hướng dẫn cài đặt và khởi chạy

1. **Cài đặt thư viện**
   Mở terminal tại thư mục dự án và chạy:
   ```bash
   npm install
   ```

2. **Cấu hình API**
   Vào file `constants/api.ts` để kiểm tra và thay đổi `API_BASE_URL` trỏ về server Backend Node.js của bạn (nếu có).

3. **Khởi chạy ứng dụng**
   - Chạy trên máy ảo Android (cần có Android Studio):
     ```bash
     npm run android
     ```
   - Chạy trên máy ảo iOS (cần macOS và Xcode):
     ```bash
     npm run ios
     ```
   - Chạy trên nền tảng Web:
     ```bash
     npm run web
     ```

## Cấu trúc thư mục
- `/app`: Chứa các file định tuyến màn hình (Routing) của Expo Router.
- `/screens`: Code giao diện của các màn hình cụ thể.
- `/components`: Các UI Component dùng chung (Card, Modal,...).
- `/services`: Các hàm tương tác với Backend API.
- `/types`: Khai báo kiểu dữ liệu TypeScript.
- `/constants`: Chứa biến màu sắc theme, đường dẫn API.
