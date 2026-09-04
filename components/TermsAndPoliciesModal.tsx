import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText } from "./ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import FeatureIconBox from "./ui/FeatureIconBox";
import { SYSTEM_ICONS } from "../constants/featureIcons";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function TermsAndPoliciesModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const isEn = language === "en";
  const styles = createStyles(theme);

  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  const termsContentVi = [
    {
      id: "1",
      title: "1. Phạm vi áp dụng & Mục đích",
      content:
        "TroHub là nền tảng công nghệ quản lý vận hành phòng trọ và căn hộ dịch vụ, kết nối trực tiếp giữa Bên Cho Thuê (Chủ trọ) và Bên Thuê (Khách thuê). Khi đăng ký và sử dụng tài khoản, người dùng đồng ý tuân thủ toàn bộ quy chế hoạt động của TroHub.",
    },
    {
      id: "2",
      title: "2. Quyền & Trách nhiệm của Chủ trọ",
      content:
        "• Cung cấp thông tin phòng trọ, đơn giá thuê, chỉ số điện nước và các chi phí dịch vụ minh bạch, chính xác.\n• Tiếp nhận và xử lý kịp thời các yêu cầu bảo trì, sửa chữa thiết bị phòng thuộc trách nhiệm của chủ nhà.\n• Xuất hóa đơn đúng hạn và hoàn trả tiền đặt cọc theo thỏa thuận khi thanh lý hợp đồng hợp lệ.",
    },
    {
      id: "3",
      title: "3. Quyền & Trách nhiệm của Khách thuê",
      content:
        "• Cung cấp thông tin CCCD chính chủ để chủ trọ thực hiện thủ tục đăng ký tạm trú theo quy định pháp luật.\n• Thanh toán tiền phòng và các hóa đơn dịch vụ đúng thời hạn được ghi nhận trên ứng dụng.\n• Có ý thức giữ gìn tài sản chung, tuân thủ nội quy phòng trọ và báo cáo sự cố qua tính năng Sửa chữa khi phát sinh sự cố.",
    },
    {
      id: "4",
      title: "4. Hợp đồng điện tử & Chữ ký số",
      content:
        "Hợp đồng thuê phòng được lập và ký duyệt trực tiếp trên nền tảng TroHub có giá trị ràng buộc dân sự giữa hai bên. Bản sao lưu hợp đồng dưới định dạng PDF/DOCX được bảo lưu trên hệ thống để làm căn cứ pháp lý đối soát khi có tranh chấp phát sinh.",
    },
    {
      id: "5",
      title: "5. Thanh toán & Đối soát hóa đơn",
      content:
        "TroHub cung cấp giải pháp quét mã VietQR tự động điền số tiền và nội dung chuyển khoản. Mọi lịch sử thanh toán được ghi nhận tự động. TroHub không can thiệp vào tài khoản ngân hàng cá nhân của các bên.",
    },
    {
      id: "6",
      title: "6. Chấm dứt hợp đồng & Hoàn trả cọc",
      content:
        "Khi kết thúc thời hạn thuê hoặc một trong hai bên có yêu cầu trả phòng trước hạn, việc thanh lý và quyết toán công nợ sẽ được thực hiện qua quy trình Duyệt trả phòng trên ứng dụng, đảm bảo tính công bằng và minh bạch.",
    },
  ];

  const termsContentEn = [
    {
      id: "1",
      title: "1. Scope & Purpose",
      content:
        "TroHub is a property management and rental platform connecting Landlords and Tenants. By registering and using TroHub, users agree to strictly abide by all platform operating rules.",
    },
    {
      id: "2",
      title: "2. Landlord Obligations",
      content:
        "• Provide accurate information regarding room availability, pricing, utilities, and extra services.\n• Timely review and resolve maintenance/repair requests.\n• Issue transparent invoices and refund deposits in accordance with valid contract terms.",
    },
    {
      id: "3",
      title: "3. Tenant Obligations",
      content:
        "• Provide valid personal identification (National ID/Passport) for legal temporary residence registration.\n• Pay rental invoices and utility bills on or before due dates.\n• Maintain room hygiene, respect house rules, and report maintenance issues promptly.",
    },
    {
      id: "4",
      title: "4. Digital Contracts & E-Signatures",
      content:
        "Rental contracts executed on TroHub carry binding legal authority under civil agreement frameworks. Secure PDF/DOCX copies are archived for audit and dispute resolution purposes.",
    },
    {
      id: "5",
      title: "5. Billing & Payment Gateway",
      content:
        "TroHub provides automated VietQR code generation for fast banking transfers. Transaction logs are recorded transparently. TroHub does not store or process payment card data directly.",
    },
    {
      id: "6",
      title: "6. Checkout & Deposit Settlement",
      content:
        "When tenancy concludes, deposit deduction and final invoice settlement are processed transparently through TroHub's Checkout Approval workflow.",
    },
  ];

  const privacyContentVi = [
    {
      id: "p1",
      title: "1. Thu thập dữ liệu cá nhân",
      content:
        "Chúng tôi thu thập các thông tin cần thiết phục vụ quản lý cư trú bao gồm: Họ tên, Số điện thoại, Email, Số CCCD, Ngày sinh và Ảnh chân dung (từ ảnh chụp CCCD khi quét OCR hợp đồng).",
    },
    {
      id: "p2",
      title: "2. Mục đích sử dụng thông tin",
      content:
        "• Tự động điền biểu mẫu hợp đồng thuê trọ hợp lệ.\n• Gửi thông báo hóa đơn, nhắc nợ, lịch ghi điện nước và tiến độ xử lý phiếu sửa chữa.\n• Hỗ trợ xác thực tài khoản và khôi phục mật khẩu khi cần thiết.",
    },
    {
      id: "p3",
      title: "3. Bảo mật & Mã hóa thông tin",
      content:
        "• Mật khẩu tài khoản được mã hóa bằng thuật toán băm một chiều an toàn (bcrypt).\n• Phiên đăng nhập được xác thực thông qua mã JWT có thời hạn và lưu trữ trong bộ nhớ bảo mật của thiết bị.\n• Mọi luồng truyền tải dữ liệu giữa ứng dụng và máy chủ đều được mã hóa bằng chuẩn TLS/SSL cao cấp.",
    },
    {
      id: "p4",
      title: "4. Cam kết không chia sẻ cho bên thứ ba",
      content:
        "TroHub cam kết tuyệt đối KHÔNG bán, chia sẻ hoặc cho thuê dữ liệu cá nhân của người dùng cho bất kỳ đơn vị quảng cáo hoặc bên thứ ba nào khi chưa có sự đồng ý của bạn, trừ trường hợp cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật.",
    },
    {
      id: "p5",
      title: "5. Quyền kiểm soát dữ liệu của người dùng",
      content:
        "Bạn có quyền chỉnh sửa thông tin hồ sơ, thay đổi mật khẩu hoặc yêu cầu vô hiệu hóa tài khoản khi đã chấm dứt toàn bộ nghĩa vụ trong hợp đồng thuê.",
    },
  ];

  const privacyContentEn = [
    {
      id: "p1",
      title: "1. Personal Data Collected",
      content:
        "We collect essential information required for tenancy management: Full name, Phone number, Email address, Citizen ID number, Date of birth, and identity photo (via OCR scanning for contracts).",
    },
    {
      id: "p2",
      title: "2. Purpose of Data Use",
      content:
        "• Auto-populate valid residential lease agreements.\n• Transmit notifications for invoices, utility readings, and maintenance progress.\n• Account verification and password recovery services.",
    },
    {
      id: "p3",
      title: "3. Data Protection & Encryption",
      content:
        "• Passwords are encrypted using robust one-way hashing (bcrypt).\n• Session authentications utilize tokenized JWT stored securely on the device.\n• All client-server traffic is transmitted under secure TLS/SSL protocols.",
    },
    {
      id: "p4",
      title: "4. Third-Party Sharing Commitment",
      content:
        "TroHub strictly adheres to a zero-sale policy: we NEVER sell, rent, or disclose personal user records to third-party advertisers without explicit user consent.",
    },
    {
      id: "p5",
      title: "5. User Privacy Rights",
      content:
        "You retain complete rights to access, amend, or request removal of your account data upon formal termination of active rental agreements.",
    },
  ];

  const currentTerms = isEn ? termsContentEn : termsContentVi;
  const currentPrivacy = isEn ? privacyContentEn : privacyContentVi;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Top Grabber */}
          <View style={styles.grabber} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <FeatureIconBox token={SYSTEM_ICONS.security} size={22} />
              <View>
                <AppText style={[styles.headerTitle, { color: theme.text }]}>
                  {isEn ? "Terms & Policies" : "Điều khoản & Chính sách"}
                </AppText>
                <AppText style={[styles.headerSubtitle, { color: theme.muted }]}>
                  {isEn ? "TroHub Legal & Privacy Framework" : "Quy chế hoạt động & Bảo mật dữ liệu TroHub"}
                </AppText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </Pressable>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={[styles.tabSwitcher, { backgroundColor: theme.surfaceElevated }]}>
            <Pressable
              style={[
                styles.tabBtn,
                activeTab === "terms" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("terms")}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={activeTab === "terms" ? theme.background : theme.muted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "terms" ? theme.background : theme.muted },
                ]}
              >
                {isEn ? "Terms of Service" : "Điều khoản sử dụng"}
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.tabBtn,
                activeTab === "privacy" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("privacy")}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={activeTab === "privacy" ? theme.background : theme.muted}
              />
              <AppText
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "privacy" ? theme.background : theme.muted },
                ]}
              >
                {isEn ? "Privacy Policy" : "Chính sách bảo mật"}
              </AppText>
            </Pressable>
          </View>

          {/* Document Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {(activeTab === "terms" ? currentTerms : currentPrivacy).map((section) => (
              <View
                key={section.id}
                style={[
                  styles.sectionCard,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                ]}
              >
                <AppText style={[styles.sectionTitle, { color: theme.primary }]}>
                  {section.title}
                </AppText>
                <AppText style={[styles.sectionBody, { color: theme.text }]}>
                  {section.content}
                </AppText>
              </View>
            ))}

            <View style={styles.footerInfo}>
              <Ionicons name="information-circle-outline" size={14} color={theme.muted} />
              <AppText style={[styles.footerText, { color: theme.muted }]}>
                {isEn
                  ? "Last updated: September 2026 · Copyright © TroHub Platform"
                  : "Cập nhật lần cuối: Tháng 09/2026 · Bản quyền thuộc TroHub Platform"}
              </AppText>
            </View>
          </ScrollView>

          {/* Bottom Confirmation Action */}
          <View style={[styles.bottomBar, { borderTopColor: theme.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tôi đã hiểu và đồng ý"
              style={[styles.agreeBtn, { backgroundColor: theme.primary }]}
              onPress={onClose}
            >
              <Ionicons name="checkmark-circle" size={18} color={theme.background} />
              <AppText style={[styles.agreeBtnText, { color: theme.background }]}>
                {isEn ? "I Understand & Agree" : "Tôi đã hiểu & Đồng ý"}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      justifyContent: "flex-end",
    },
    modalCard: {
      maxHeight: "88%",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      paddingTop: 10,
    },
    grabber: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignSelf: "center",
      marginBottom: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "900",
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    tabSwitcher: {
      flexDirection: "row",
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 4,
      marginBottom: 12,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: "900",
    },
    scrollView: {
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingBottom: 20,
      gap: 10,
    },
    sectionCard: {
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "900",
      marginBottom: 8,
    },
    sectionBody: {
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "500",
    },
    footerInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 8,
      marginBottom: 6,
    },
    footerText: {
      fontSize: 11,
      fontWeight: "600",
    },
    bottomBar: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 26,
      borderTopWidth: 1,
    },
    agreeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      borderRadius: 16,
    },
    agreeBtnText: {
      fontSize: 14,
      fontWeight: "900",
    },
  });
}
