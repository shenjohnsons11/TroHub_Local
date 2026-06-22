import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { invoiceService } from '../services/invoiceService';

const COLORS = {
  primary: '#1A4D2E',
  secondary: '#4F6F52',
  orange: '#FF9F29',
  surface: '#FAF3E0',
  white: '#FFFFFF',
  text: '#333333',
  muted: '#888888',
  border: '#E0E0E0',
  danger: '#D32F2F',
  success: '#388E3C'
};

export default function BulkInvoiceScreen({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getBulkPreview();
      setData((res || []).map(item => ({ ...item, selected: true })));
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index][field] = value ? Number(value) : '';
    setData(newData);
  };

  const toggleSelection = (index: number) => {
    const newData = [...data];
    newData[index].selected = !newData[index].selected;
    setData(newData);
  };

  const toggleSelectAll = () => {
    const allSelected = data.every(d => d.selected);
    setData(data.map(d => ({ ...d, selected: !allSelected })));
  };

  const calculateTotal = (item: any) => {
    const eOld = item.electricityOld || 0;
    const eNew = item.electricityNew || 0;
    const wOld = item.waterOld || 0;
    const wNew = item.waterNew || 0;
    
    const eAmount = Math.max(0, eNew - eOld) * (item.electricityPrice || 0);
    const wAmount = Math.max(0, wNew - wOld) * (item.waterPrice || 0);
    
    return (item.roomAmount || 0) + (item.services || 0) + eAmount + wAmount;
  };

  const handleSubmit = async () => {
    const selectedData = data.filter(d => d.selected);
    if (selectedData.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 phòng để tạo hóa đơn.');
      return;
    }

    let hasError = false;
    for (const item of selectedData) {
      if (item.electricityPrice > 0) {
        if (item.electricityNew === undefined || item.electricityNew === '') hasError = true;
        if (Number(item.electricityNew) < item.electricityOld) hasError = true;
      } else {
        item.electricityNew = item.electricityOld;
      }
      
      if (item.waterPrice > 0) {
        if (item.waterNew === undefined || item.waterNew === '') hasError = true;
        if (Number(item.waterNew) < item.waterOld) hasError = true;
      } else {
        item.waterNew = item.waterOld;
      }
    }

    if (hasError) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ chỉ số MỚI cho tất cả các phòng đã chọn. Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.');
      return;
    }

    Alert.alert('Xác nhận', `Phát hành ${selectedData.length} hóa đơn cùng lúc?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Phát hành', onPress: async () => {
        try {
          setSubmitting(true);
          await invoiceService.bulkCreate({ invoices: selectedData });
          Alert.alert('Thành công', 'Đã tạo hóa đơn hàng loạt!');
          onNavigate("invoice");
        } catch (e: any) {
          Alert.alert('Lỗi', e.message);
        } finally {
          setSubmitting(false);
        }
      }}
    ]);
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const total = calculateTotal(item);
    
    return (
      <View style={[styles.card, !item.selected && { opacity: 0.6 }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => toggleSelection(index)} style={{ marginRight: 8 }}>
              <Ionicons name={item.selected ? "checkbox" : "square-outline"} size={24} color={item.selected ? COLORS.primary : COLORS.muted} />
            </TouchableOpacity>
            <Text style={styles.roomText}>Phòng {item.room}</Text>
          </View>
          <Text style={styles.tenantText}>{item.tenant}</Text>
        </View>
        
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tiền phòng:</Text>
            <TextInput
              style={styles.input}
              placeholder="Tiền phòng..."
              keyboardType="numeric"
              value={item.roomAmount !== undefined ? String(item.roomAmount) : ''}
              onChangeText={(text: string) => handleInputChange(index, 'roomAmount', text)}
            />
          </View>
          <View style={[styles.inputGroup, { marginLeft: 12 }]}>
            <Text style={styles.inputLabel}>Phí dịch vụ:</Text>
            <TextInput
              style={styles.input}
              placeholder="Dịch vụ..."
              keyboardType="numeric"
              value={item.services !== undefined ? String(item.services) : ''}
              onChangeText={(text: string) => handleInputChange(index, 'services', text)}
            />
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Điện cũ: <Text style={{fontWeight: 'bold'}}>{item.electricityOld}</Text></Text>
            {item.electricityPrice > 0 ? (
              <TextInput
                style={styles.input}
                placeholder="Điện mới..."
                keyboardType="numeric"
                value={item.electricityNew !== undefined ? String(item.electricityNew) : ''}
                onChangeText={(text: string) => handleInputChange(index, 'electricityNew', text)}
              />
            ) : (
              <Text style={{color: '#888', marginTop: 10}}>Không tính theo khối</Text>
            )}
          </View>
          
          <View style={[styles.inputGroup, { marginLeft: 12 }]}>
            <Text style={styles.inputLabel}>Nước cũ: <Text style={{fontWeight: 'bold'}}>{item.waterOld}</Text></Text>
            {item.waterPrice > 0 ? (
              <TextInput
                style={styles.input}
                placeholder="Nước mới..."
                keyboardType="numeric"
                value={item.waterNew !== undefined ? String(item.waterNew) : ''}
                onChangeText={(text: string) => handleInputChange(index, 'waterNew', text)}
              />
            ) : (
              <Text style={{color: '#888', marginTop: 10}}>Không tính theo khối</Text>
            )}
          </View>
        </View>
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Thành tiền:</Text>
          <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')} đ</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate("invoice")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Lập HĐ Hàng Loạt</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleSelectAll} style={{ padding: 4 }}>
            <Ionicons name={data.length > 0 && data.every(d => d.selected) ? "checkbox" : "square-outline"} size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item: any) => item.contractId}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có hợp đồng nào đang hiệu lực để lập hóa đơn.</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, data.length === 0 && {backgroundColor: COLORS.muted}]} 
          onPress={handleSubmit}
          disabled={submitting || data.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>PHÁT HÀNH ({data.filter(d => d.selected).length})</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRight: { width: 32, alignItems: 'center' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  listContainer: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  roomText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  tenantText: { fontSize: 14, color: COLORS.muted },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 14, color: COLORS.text },
  infoValue: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#FAFAFA'
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.orange },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontSize: 15 }
});
