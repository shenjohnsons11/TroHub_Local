import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui/typography";
import { Contract } from "../types/Contract";
import { useAppTheme } from "../contexts/ThemeContext";
import ProgressStepper from "./ui/ProgressStepper";
import AppButton from "./ui/AppButton";
import { formatCurrency, formatMeterReading, unformatNumber } from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSign: (contract: Contract, signatureBase64?: string) => Promise<void>;
};

export default function SignContractWizard({ visible, contract, onClose, onSign }: Props) {
  const { theme, resolvedTheme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const isDark = resolvedTheme === "dark";

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [hasDrawn, setHasDrawn] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const titleRef = useRef<React.ElementRef<typeof AppText>>(null);

  const steps = [
    { label: t("contracts.roomInfo"), icon: "home-outline" as const },
    { label: t("nav.services"), icon: "flash-outline" as const },
    { label: t("contracts.terms"), icon: "document-text-outline" as const },
    { label: t("contracts.signContract"), icon: "create-outline" as const },
  ];

  const signaturePadHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body {
      background-color: ${isDark ? "#1E293B" : "#F8FAFC"};
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    #canvas {
      width: 100%;
      height: 100%;
      touch-action: none;
      background: transparent;
      cursor: crosshair;
    }
    .placeholder {
      position: absolute;
      color: ${isDark ? "#64748B" : "#94A3B8"};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="hint" class="placeholder">✍️ Vẽ chữ ký tay của bạn vào đây</div>
  <canvas id="canvas"></canvas>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const hint = document.getElementById('hint');
    let drawing = false;
    let hasDrawn = false;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '${isDark ? "#38BDF8" : "#0284C7"}';
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 100);

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function startDraw(e) {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (!hasDrawn) {
        hasDrawn = true;
        hint.style.display = 'none';
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DRAWN' }));
      }
    }

    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function endDraw(e) {
      if (!drawing) return;
      e.preventDefault();
      drawing = false;
    }

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw, { passive: false });

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);

    window.clearCanvas = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      hint.style.display = 'block';
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLEARED' }));
    };

    window.getSignature = function() {
      if (!hasDrawn) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EMPTY' }));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SIGNATURE', data: dataUrl }));
    };
  </script>
</body>
</html>
`;

  useEffect(() => {
    if (!visible) return;
    setCurrentStep(1);
    setHasDrawn(false);
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!contract) return null;

  const handleMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "DRAWN") {
        setHasDrawn(true);
      } else if (msg.type === "CLEARED") {
        setHasDrawn(false);
      } else if (msg.type === "EMPTY") {
        setSubmitting(false);
      } else if (msg.type === "SIGNATURE" && msg.data) {
        try {
          await onSign(contract, msg.data);
        } finally {
          setSubmitting(false);
        }
      }
    } catch (e) {
      setSubmitting(false);
    }
  };

  const handleClearSignature = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript("window.clearCanvas(); true;");
    setHasDrawn(false);
  };

  const handleSignSubmit = () => {
    if (!agreed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    if (hasDrawn) {
      webViewRef.current?.injectJavaScript("window.getSignature(); true;");
    } else {
      // Fallback ký không cần chữ ký vẽ
      onSign(contract).finally(() => setSubmitting(false));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("contracts.roomInfo")}</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("common.room")}:</AppText>
              <AppText style={styles.infoValue}>{contract.room}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.rentFee")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.rentFee))}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.deposit")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.deposit))}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.startDate")} - {t("contracts.endDate")}:</AppText>
              <AppText style={styles.infoValue}>{contract.startDate} - {contract.endDate}</AppText>
            </View>
          </ScrollView>
        );
      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("nav.services")}</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.electricityPrice")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.serviceFees.electric))} / kWh</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.initialElec")}:</AppText>
              <AppText style={styles.infoValue}>{formatMeterReading(contract.meterTerms.initialElectricity)} kWh</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.waterPrice")}:</AppText>
              <AppText style={styles.infoValue}>{formatCurrency(unformatNumber(contract.serviceFees.water))} / m³</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>{t("contracts.initialWater")}:</AppText>
              <AppText style={styles.infoValue}>{formatMeterReading(contract.meterTerms.initialWater)} m³</AppText>
            </View>
          </ScrollView>
        );
      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("contracts.terms")}</AppText>
            <AppText style={styles.termsText}>
              1. Người thuê cần thanh toán tiền phòng trước ngày 05 hằng tháng.{"\n"}
              2. Giữ gìn an ninh trật tự, phòng cháy chữa cháy và vệ sinh chung.{"\n"}
              3. Khi có nhu cầu gia hạn hoặc thanh lý hợp đồng, vui lòng thông báo trước 30 ngày.{"\n"}
              4. Hợp đồng điện tử có đầy đủ giá trị pháp lý sau khi ký xác nhận.
            </AppText>
          </ScrollView>
        );
      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>{t("contracts.signContract")}</AppText>
            <AppText style={styles.confirmText}>
              Người thuê: <AppText style={{ fontWeight: "900", color: theme.primary }}>{contract.tenantName}</AppText> • Phòng {contract.room}
            </AppText>

            {/* Signature Pad */}
            <View style={styles.canvasSection}>
              <View style={styles.canvasHeader}>
                <AppText style={styles.canvasTitle}>Vẽ chữ ký tay của bạn:</AppText>
                <Pressable
                  style={[styles.clearBtn, !hasDrawn && { opacity: 0.4 }]}
                  onPress={handleClearSignature}
                  disabled={!hasDrawn}
                >
                  <Ionicons name="refresh-outline" size={13} color="#EF4444" />
                  <AppText style={styles.clearBtnText}>Xóa vẽ lại</AppText>
                </Pressable>
              </View>

              <View style={[styles.canvasBox, { borderColor: hasDrawn ? theme.primary : theme.border }]}>
                <WebView
                  ref={webViewRef}
                  originWhitelist={["*"]}
                  source={{ html: signaturePadHtml }}
                  onMessage={handleMessage}
                  style={styles.canvasWebView}
                  scrollEnabled={false}
                />
              </View>
            </View>

            {/* Checkbox agreement */}
            <Pressable 
              style={[styles.checkboxContainer, agreed && styles.checkboxActive]} 
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <AppText style={styles.checkboxLabel}>
                Tôi đã đọc kỹ, hiểu rõ và cam kết tuân thủ toàn bộ các điều khoản trong hợp đồng thuê phòng.
              </AppText>
            </Pressable>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={submitting ? () => undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.wizardContent} accessibilityViewIsModal>
          <View style={styles.wizardHeader}>
            <View>
              <AppText
                ref={titleRef}
                style={styles.wizardTitle}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                {t("contracts.signContract")}
              </AppText>
              <AppText style={styles.wizardSubtitle}>Bước {currentStep}/4</AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={24} color={theme.muted} />
            </Pressable>
          </View>

          <View style={styles.stepperContainer}>
            <ProgressStepper steps={steps} currentStep={currentStep - 1} />
          </View>

          <View style={styles.body}>
            {renderStepContent()}
          </View>

          <View style={styles.wizardFooter}>
            {currentStep > 1 && (
              <AppButton
                title={t("common.back")}
                variant="outline"
                onPress={() => setCurrentStep((prev) => prev - 1)}
                style={styles.footerBtn}
                disabled={submitting}
              />
            )}
            {currentStep < 4 ? (
              <AppButton
                title={t("common.next")}
                variant="primary"
                onPress={() => setCurrentStep((prev) => prev + 1)}
                style={styles.footerBtn}
              />
            ) : (
              <AppButton
                title={submitting ? "Đang xuất bản hợp đồng..." : "Xác nhận Ký & Xuất Hợp Đồng"}
                variant="primary"
                onPress={handleSignSubmit}
                disabled={!agreed || submitting}
                style={styles.footerBtn}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>["theme"]) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      justifyContent: "flex-end",
    },
    wizardContent: {
      backgroundColor: theme.surfaceElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
      paddingBottom: 24,
    },
    wizardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    wizardTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: theme.text,
    },
    wizardSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    closeButton: {
      padding: 4,
    },
    stepperContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    body: {
      paddingHorizontal: 20,
      minHeight: 240,
      maxHeight: 340,
    },
    stepContent: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    infoLabel: {
      fontSize: 13,
      color: theme.muted,
      fontWeight: "600",
    },
    infoValue: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },
    termsText: {
      fontSize: 13,
      color: theme.text,
      lineHeight: 22,
    },
    confirmText: {
      fontSize: 13,
      color: theme.text,
      marginBottom: 12,
    },
    canvasSection: {
      gap: 6,
      marginBottom: 14,
    },
    canvasHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    canvasTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.text,
    },
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 2,
    },
    clearBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#EF4444",
    },
    canvasBox: {
      height: 140,
      borderRadius: 14,
      borderWidth: 1.5,
      overflow: "hidden",
      backgroundColor: "transparent",
    },
    canvasWebView: {
      flex: 1,
      backgroundColor: "transparent",
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginTop: 4,
      padding: 10,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    checkboxActive: {
      borderColor: theme.primary,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.muted,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkboxLabel: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "600",
      flex: 1,
      lineHeight: 18,
    },
    wizardFooter: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerBtn: {
      flex: 1,
    },
  });
