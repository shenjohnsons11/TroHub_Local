const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../screens/AdminContractsScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Wizard states
content = content.replace(
  `  const [submitting, setSubmitting] = useState(false);`,
  `  const [submitting, setSubmitting] = useState(false);\n\n  // Wizard states\n  const [currentStep, setCurrentStep] = useState(1);\n  const [confirmed, setConfirmed] = useState(false);\n  const [services, setServices] = useState({\n    electricity: { enabled: true, price: '3500' },\n    water: { enabled: true, price: '25000' },\n    trash: { enabled: true, price: '20000' },\n    internet: { enabled: true, price: '100000' },\n    management: { enabled: false, price: '50000' },\n  });`
);

// 2. Add cleanup in handleCreateContract
content = content.replace(
  `      setModalVisible(false);\n      setSelectedRoomId("");\n      setSelectedTenantId("");`,
  `      setModalVisible(false);\n      setSelectedRoomId("");\n      setSelectedTenantId("");\n      setCurrentStep(1);\n      setConfirmed(false);`
);

// 3. Add Switch from react-native
if (!content.includes('Switch,')) {
  content = content.replace(
    `import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from "react-native";`,
    `import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert, ScrollView, Switch } from "react-native";`
  );
}

// 4. Replace Modal UI
const oldModalStart = content.indexOf('{/* Modal Tạo hợp đồng mới */}');
const oldModalEnd = content.indexOf('</Modal>') + 8;
const beforeModal = content.substring(0, oldModalStart);
const afterModal = content.substring(oldModalEnd);

const newModalUI = `{/* Modal Tạo hợp đồng mới (Wizard 4 Bước) */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.wizardContent}>
            {/* Header */}
            <View style={styles.wizardHeader}>
              <View>
                <Text style={styles.wizardTitle}>Tạo hợp đồng mới</Text>
                <Text style={styles.wizardSubtitle}>Hoàn tất 4 bước để lập hợp đồng thuê phòng.</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </Pressable>
            </View>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
              {[
                { num: 1, label: 'Người thuê', icon: 'person' },
                { num: 2, label: 'Chi tiết', icon: 'home' },
                { num: 3, label: 'Dịch vụ', icon: 'flash' },
                { num: 4, label: 'Xác nhận', icon: 'checkmark-circle' },
              ].map((step, index) => {
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;
                return (
                  <View key={step.num} style={styles.stepItemWrapper}>
                    <View style={styles.stepItem}>
                      <View style={[
                        styles.stepCircle,
                        isCompleted ? styles.stepCircleCompleted : isActive ? styles.stepCircleActive : styles.stepCircleInactive
                      ]}>
                        <Ionicons name={step.icon as any} size={14} color={isCompleted || isActive ? "#FFF" : COLORS.muted} />
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepLabelMini}>BƯỚC {step.num}</Text>
                        <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
                      </View>
                    </View>
                    {index < 3 && (
                      <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Content */}
            <ScrollView style={styles.wizardBody} showsVerticalScrollIndicator={false}>
              
              {/* BƯỚC 1: NGƯỜI THUÊ */}
              {currentStep === 1 && (
                <View style={styles.stepContent}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Người thuê</Text>
                    <Text style={styles.cardSubtitle}>Chọn người thuê đã có trên hệ thống để lập hợp đồng.</Text>
                    
                    {tenants.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có người thuê nào trên hệ thống!</Text>
                    ) : (
                      <View style={styles.tenantSelectGrid}>
                        {tenants.map((t) => (
                          <Pressable
                            key={t._id}
                            style={[
                              styles.tenantSelectItem,
                              selectedTenantId === t._id && styles.tenantSelectActive
                            ]}
                            onPress={() => setSelectedTenantId(t._id)}
                          >
                            <Text style={[
                              styles.tenantSelectText,
                              selectedTenantId === t._id && styles.tenantSelectTextActive
                            ]}>
                              {t.fullName}
                            </Text>
                            <Text style={styles.tenantPhoneText}>{t.phone}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* BƯỚC 2: CHI TIẾT THUÊ */}
              {currentStep === 2 && (
                <View style={styles.stepContent}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Phòng thuê</Text>
                    <Text style={styles.cardSubtitle}>Chọn phòng còn trống để lập hợp đồng.</Text>
                    
                    {selectableRooms.length === 0 ? (
                      <Text style={styles.noVacantText}>Không có phòng nào có thể chọn!</Text>
                    ) : (
                      <View style={styles.roomSelectGrid}>
                        {selectableRooms.map((room) => (
                          <Pressable
                            key={room._id}
                            style={[
                              styles.roomSelectItem,
                              selectedRoomId === room._id && styles.roomSelectActive
                            ]}
                            onPress={() => handleSelectRoom(room._id)}
                          >
                            <Text style={[
                              styles.roomSelectText,
                              selectedRoomId === room._id && styles.roomSelectTextActive
                            ]}>
                              {room.roomCode}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Điều khoản thuê</Text>
                    
                    <View style={styles.inputGroupRow}>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Giá thuê (VNĐ/tháng) <Text style={styles.required}>*</Text></Text>
                        <TextInput style={styles.input} value={fixedRent} onChangeText={setFixedRent} keyboardType="numeric" placeholder="VD: 3500000" />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Tiền cọc (VNĐ) <Text style={styles.required}>*</Text></Text>
                        <TextInput style={styles.input} value={fixedDeposit} onChangeText={setFixedDeposit} keyboardType="numeric" placeholder="VD: 3500000" />
                      </View>
                    </View>

                    <View style={styles.inputGroupRow}>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Ngày bắt đầu <Text style={styles.required}>*</Text></Text>
                        <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Ngày kết thúc <Text style={styles.required}>*</Text></Text>
                        <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* BƯỚC 3: DỊCH VỤ */}
              {currentStep === 3 && (
                <View style={styles.stepContent}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Dịch vụ & tiện ích</Text>
                    <Text style={styles.cardSubtitle}>Bật các dịch vụ áp dụng cho hợp đồng này và điều chỉnh đơn giá.</Text>
                    
                    {[
                      { key: 'electricity', label: 'Điện', desc: 'Tính theo số điện', unit: 'VNĐ/kWh' },
                      { key: 'water', label: 'Nước', desc: 'Tính theo người/khối', unit: 'VNĐ' },
                      { key: 'trash', label: 'Rác', desc: 'Phí thu gom', unit: 'VNĐ/tháng' },
                      { key: 'internet', label: 'Internet', desc: 'Wi-Fi', unit: 'VNĐ/tháng' },
                      { key: 'management', label: 'Phí quản lý', desc: 'Vệ sinh chung', unit: 'VNĐ/tháng' },
                    ].map(svc => {
                      const service = services[svc.key as keyof typeof services];
                      return (
                        <View key={svc.key} style={[styles.serviceItem, service.enabled && styles.serviceItemActive]}>
                          <View style={styles.serviceHeader}>
                            <View>
                              <Text style={styles.serviceLabel}>{svc.label}</Text>
                              <Text style={styles.serviceDesc}>{svc.desc}</Text>
                            </View>
                            <Switch
                              value={service.enabled}
                              onValueChange={(val) => setServices({...services, [svc.key]: {...service, enabled: val}})}
                              trackColor={{ false: "#E8E9ED", true: COLORS.orange }}
                            />
                          </View>
                          <View style={styles.serviceInputRow}>
                            <TextInput
                              style={[styles.input, !service.enabled && styles.inputDisabled, { flex: 1, height: 36 }]}
                              value={service.price}
                              onChangeText={(text) => setServices({...services, [svc.key]: {...service, price: text}})}
                              editable={service.enabled}
                              keyboardType="numeric"
                            />
                            <Text style={styles.serviceUnit}>{svc.unit}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* BƯỚC 4: XÁC NHẬN */}
              {currentStep === 4 && (
                <View style={styles.stepContent}>
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTag}>BẢN XEM TRƯỚC HỢP ĐỒNG</Text>
                    
                    <View style={styles.previewSection}>
                      <Text style={styles.previewSectionTitle}>NGƯỜI THUÊ</Text>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Họ tên</Text>
                        <Text style={styles.previewValue}>{tenants.find(t => t._id === selectedTenantId)?.fullName || "Chưa chọn"}</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Điện thoại</Text>
                        <Text style={styles.previewValue}>{tenants.find(t => t._id === selectedTenantId)?.phone || "Chưa chọn"}</Text>
                      </View>
                    </View>

                    <View style={styles.previewSection}>
                      <Text style={styles.previewSectionTitle}>CHI TIẾT THUÊ</Text>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Phòng</Text>
                        <Text style={styles.previewValue}>{rooms.find(r => r._id === selectedRoomId)?.roomCode || "Chưa chọn"}</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Giá thuê</Text>
                        <Text style={styles.previewValue}>{Number(fixedRent || 0).toLocaleString('vi-VN')}đ/tháng</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Tiền cọc</Text>
                        <Text style={styles.previewValue}>{Number(fixedDeposit || 0).toLocaleString('vi-VN')}đ</Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Thời hạn</Text>
                        <Text style={styles.previewValue}>{startDate} → {endDate}</Text>
                      </View>
                    </View>
                  </View>

                  <Pressable style={styles.confirmCheckbox} onPress={() => setConfirmed(!confirmed)}>
                    <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                      {confirmed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <View>
                      <Text style={styles.confirmTitle}>Tôi xác nhận thông tin chính xác</Text>
                      <Text style={styles.confirmDesc}>Hợp đồng nháp sẽ được tạo và chờ người thuê duyệt.</Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.wizardFooter}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <View style={styles.footerActions}>
                {currentStep > 1 && (
                  <Pressable style={styles.backBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
                    <Ionicons name="chevron-back" size={16} color={COLORS.text} />
                    <Text style={styles.backBtnText}>Quay lại</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[
                    styles.nextBtn,
                    (currentStep === 4 && !confirmed) && styles.nextBtnDisabled,
                    submitting && styles.nextBtnDisabled
                  ]}
                  onPress={() => {
                    if (currentStep < 4) setCurrentStep(prev => prev + 1);
                    else handleCreateContract();
                  }}
                  disabled={(currentStep === 4 && !confirmed) || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.nextBtnText}>{currentStep < 4 ? 'Tiếp tục' : 'Tạo hợp đồng'}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>`;

content = beforeModal + newModalUI + afterModal;

// 5. Add new styles
const extraStyles = `
  wizardContent: {
    backgroundColor: "#F4F5F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  wizardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  wizardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "#F4F5F7",
    borderRadius: 8,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E9ED",
  },
  stepItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleInactive: {
    backgroundColor: "#F4F5F7",
  },
  stepCircleActive: {
    backgroundColor: COLORS.orange,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.green,
  },
  stepTextContainer: {
    marginLeft: 8,
    display: "none", // Hide text on small screens, can use responsive design later
  },
  stepLabelMini: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
  },
  stepLabelActive: {
    color: COLORS.orange,
    fontWeight: "800",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E8E9ED",
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.green,
  },
  wizardBody: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E9ED",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  inputGroupRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  required: {
    color: COLORS.red,
  },
  serviceItem: {
    borderWidth: 1,
    borderColor: "#E8E9ED",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  serviceItemActive: {
    borderColor: COLORS.orangeSoft,
    backgroundColor: COLORS.orangeSoft,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  serviceDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  serviceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputDisabled: {
    backgroundColor: "#F4F5F7",
    color: COLORS.muted,
  },
  serviceUnit: {
    fontSize: 12,
    color: COLORS.muted,
    width: 80,
  },
  previewCard: {
    backgroundColor: COLORS.orangeSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 106, 33, 0.2)',
    marginBottom: 20,
  },
  previewTag: {
    fontSize: 11,
    color: COLORS.orange,
    fontWeight: "800",
    marginBottom: 12,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewSectionTitle: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "800",
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  previewLabel: {
    width: 90,
    fontSize: 13,
    color: COLORS.muted,
  },
  previewValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  confirmCheckbox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E9ED",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  confirmDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },
  wizardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E9ED",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
  },
  footerActions: {
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E9ED",
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 4,
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tenantPhoneText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
`;

const styleInsertPoint = content.lastIndexOf('});');
content = content.substring(0, styleInsertPoint) + extraStyles + content.substring(styleInsertPoint);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminContractsScreen.tsx');
