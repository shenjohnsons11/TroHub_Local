INSERT INTO users (id, full_name, phone, email, password_hash, role, citizen_id, bank_name, bank_account, address, emergency_contact, status)
VALUES
  ('U001', 'Nguyễn Chủ Trọ', '0900000000', 'admin@trohub.vn', '123456', 'LANDLORD', NULL, 'VCB', '0123456789', '25 Nguyễn Văn Cừ, Quận 5, TP.HCM', NULL, 'ACTIVE'),
  ('U002', 'Nguyễn Văn A', '0901234567', 'tenant@trohub.vn', '123456', 'TENANT', '001202600001', NULL, NULL, 'TP.HCM', '0908888888', 'ACTIVE'),
  ('U003', 'Trần Thị B', '0902222333', 'tranb@trohub.vn', '123456', 'TENANT', '001202600002', NULL, NULL, 'TP.HCM', '0907777777', 'ACTIVE'),
  ('U004', 'Lê Văn C', '0909999888', 'levanc@trohub.vn', '123456', 'TENANT', '001202600003', NULL, NULL, 'TP.HCM', '0906666666', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO boarding_houses (id, owner_user_id, name, address, description, status)
VALUES ('H001', 'U001', 'TroHub Nguyễn Văn Cừ', '25 Nguyễn Văn Cừ, Quận 5, TP.HCM', 'Nhà trọ hiện đại, gần trung tâm.', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, house_id, owner_user_id, code, name, area_m2, rent_price, deposit_amount, max_occupants, current_occupants, status, note)
VALUES
  ('R001', 'H001', 'U001', 'A101', 'Phòng A101', 25, 2500000, 2500000, 3, 1, 'OCCUPIED', 'Phòng có ban công, đầy đủ nội thất.'),
  ('R002', 'H001', 'U001', 'A102', 'Phòng A102', 28, 2800000, 2800000, 3, 1, 'OCCUPIED', 'Gần cầu thang, thoáng mát.'),
  ('R003', 'H001', 'U001', 'B201', 'Phòng B201', 30, 3000000, 3000000, 4, 0, 'AVAILABLE', 'Phòng lớn phù hợp gia đình nhỏ.'),
  ('R004', 'H001', 'U001', 'B202', 'Phòng B202', 22, 2200000, 2200000, 2, 0, 'MAINTENANCE', 'Đang sửa hệ thống nước.'),
  ('R005', 'H001', 'U001', 'C301', 'Phòng C301', 32, 3200000, 3200000, 4, 2, 'OCCUPIED', 'View thoáng, có cửa sổ lớn.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contracts (
  id, code, room_id, landlord_user_id, tenant_user_id, sign_date, rent_start_date, start_date, end_date,
  rent_price, deposit_amount, electricity_unit_price, water_unit_price, electricity_start_index, water_start_index,
  electricity_current_index, water_current_index, vehicle_count, vehicle_fee, internet_fee, trash_fee,
  extra_terms, tenant_accepted_at, landlord_accepted_at, status
)
VALUES
  ('C000', 'HD-A101-2025', 'R001', 'U001', 'U003', '2024-12-28', '2025-01-01', '2025-01-01', '2025-12-31', 2400000, 2400000, 3800, 14000, 910, 18, 1200, 43, 1, 180000, 100000, 30000, 'Đã bàn giao phòng cuối kỳ.', '2024-12-28 08:00:00', '2024-12-28 08:15:00', 'TERMINATED'),
  ('C001', 'HD-A101-2026', 'R001', 'U001', 'U002', '2025-12-28', '2026-01-01', '2026-01-01', '2026-12-30', 2500000, 2500000, 4000, 15000, 1200, 43, 1350, 57, 1, 200000, 100000, 30000, 'Thanh toán trước ngày 05 hằng tháng.', '2025-12-28 08:00:00', NULL, 'PENDING_LANDLORD'),
  ('C002', 'HD-A102-2026', 'R002', 'U001', 'U003', '2026-02-10', '2026-02-15', '2026-02-15', '2027-02-14', 2800000, 2800000, 4000, 15000, 900, 20, 970, 26, 1, 200000, 100000, 30000, '', '2026-02-10 08:00:00', '2026-02-10 08:15:00', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contract_occupants (id, contract_id, user_id, full_name, phone, citizen_id, relationship)
VALUES
  ('CO001', 'C001', 'U002', 'Nguyễn Văn A', '0901234567', '001202600001', 'Người thuê chính'),
  ('CO002', 'C002', 'U003', 'Trần Thị B', '0902222333', '001202600002', 'Người thuê chính')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, name, unit, default_price, is_active)
VALUES
  ('S001', 'Tiền phòng', 'date-range', 2500000, true),
  ('S002', 'Điện', 'kWh', 4000, true),
  ('S003', 'Nước', 'm3', 15000, true),
  ('S004', 'Phí xe', 'vehicle', 200000, true),
  ('S005', 'Internet', 'date-range', 100000, true),
  ('S006', 'Rác', 'date-range', 30000, true),
  ('S007', 'Phí phạt trễ hạn', 'percent', 0.1, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (
  id, code, room_id, landlord_user_id, tenant_user_id, contract_id, from_date, to_date, due_date,
  room_amount, electricity_amount, water_amount, service_amount, discount_amount,
  penalty_days, penalty_rate, penalty_amount, total_amount, payment_method, transaction_code, paid_at, status
)
VALUES
  ('I001', 'HD0526-A101', 'R001', 'U001', 'U002', 'C001', '2026-05-01', '2026-05-31', '2026-06-05', 2500000, 320000, 105000, 330000, 0, 0, 0.1, 0, 3255000, 'BANK_QR', '', NULL, 'UNPAID'),
  ('I002', 'HD0426-A101', 'R001', 'U001', 'U002', 'C001', '2026-04-01', '2026-04-30', '2026-05-05', 2500000, 280000, 105000, 330000, 80000, 0, 0.1, 0, 3135000, 'BANK_QR', 'VCB0426A101', '2026-05-03 09:00:00', 'PAID'),
  ('I003', 'HD0526-A102', 'R002', 'U001', 'U003', 'C002', '2026-05-01', '2026-05-31', '2026-06-05', 2800000, 280000, 90000, 330000, 0, 0, 0.1, 0, 3500000, 'VNPAY', 'VNP0526A102', '2026-06-02 08:30:00', 'PAID'),
  ('I004', 'HD0526-C301', 'R005', 'U001', 'U004', NULL, '2026-05-01', '2026-05-31', '2026-06-05', 3200000, 400000, 120000, 330000, 0, 3, 0.1, 405000, 4455000, 'CASH', '', NULL, 'OVERDUE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_details (id, invoice_id, service_id, label, quantity, unit_price, amount)
VALUES
  ('ID001', 'I001', 'S001', 'Tiền phòng', 1, 2500000, 2500000),
  ('ID002', 'I001', 'S002', 'Điện', 80, 4000, 320000),
  ('ID003', 'I001', 'S003', 'Nước', 7, 15000, 105000),
  ('ID004', 'I001', 'S004', 'Phí xe', 1, 200000, 200000),
  ('ID005', 'I001', 'S005', 'Internet', 1, 100000, 100000),
  ('ID006', 'I001', 'S006', 'Rác', 1, 30000, 30000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO meter_readings (
  id, room_id, contract_id, invoice_id, type, from_date, to_date, previous_index, current_index, usage_amount, unit_price, amount, created_by
)
VALUES
  ('M001', 'R001', 'C001', NULL, 'ELECTRICITY', '2025-12-01', '2025-12-31', 910, 980, 70, 4000, 280000, 'U001'),
  ('M002', 'R001', 'C001', NULL, 'WATER', '2025-12-01', '2025-12-31', 18, 24, 6, 15000, 90000, 'U001'),
  ('M003', 'R001', 'C001', NULL, 'ELECTRICITY', '2026-01-01', '2026-01-31', 980, 1052, 72, 4000, 288000, 'U001'),
  ('M004', 'R001', 'C001', NULL, 'WATER', '2026-01-01', '2026-01-31', 24, 30, 6, 15000, 90000, 'U001'),
  ('M005', 'R001', 'C001', 'I002', 'ELECTRICITY', '2026-04-01', '2026-04-30', 1200, 1270, 70, 4000, 280000, 'U001'),
  ('M006', 'R001', 'C001', 'I002', 'WATER', '2026-04-01', '2026-04-30', 43, 50, 7, 15000, 105000, 'U001'),
  ('M007', 'R001', 'C001', 'I001', 'ELECTRICITY', '2026-05-01', '2026-05-31', 1270, 1350, 80, 4000, 320000, 'U001'),
  ('M008', 'R001', 'C001', 'I001', 'WATER', '2026-05-01', '2026-05-31', 50, 57, 7, 15000, 105000, 'U001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, invoice_id, payer_user_id, method, amount, transaction_code, penalty_amount, paid_at, status)
VALUES
  ('PM001', 'I002', 'U002', 'BANK_QR', 3135000, 'VCB0426A101', 0, '2026-05-03 09:00:00', 'SUCCESS'),
  ('PM002', 'I001', 'U002', 'BANK_QR', 3255000, '', 0, NULL, 'PENDING'),
  ('PM003', 'I003', 'U003', 'VNPAY', 3500000, 'VNP0526A102', 0, '2026-06-02 08:30:00', 'SUCCESS'),
  ('PM004', 'I004', 'U004', 'CASH', 4455000, '', 405000, NULL, 'PENDING')
ON CONFLICT (id) DO NOTHING;

INSERT INTO repair_requests (id, code, room_id, requester_user_id, category, description, priority, priority_set_by, status, landlord_note, created_at)
VALUES
  ('RR001', 'YC001', 'R001', 'U002', 'Máy lạnh', 'Máy lạnh bật nhưng không lạnh.', 'HIGH', 'U001', 'IN_PROGRESS', 'Hẹn kỹ thuật 15:00 hôm nay.', '2026-05-01 08:00:00'),
  ('RR002', 'YC002', 'R002', 'U003', 'Nước', 'Rò rỉ nước tại lavabo.', 'MEDIUM', 'U001', 'COMPLETED', 'Đã thay ron.', '2026-04-20 09:00:00'),
  ('RR003', 'YC003', 'R005', 'U004', 'Internet', 'Internet chập chờn buổi tối.', 'LOW', 'U001', 'NEW', 'Đang kiểm tra.', '2026-04-18 10:00:00'),
  ('RR004', 'YC004', 'R002', 'U003', 'Cửa / khóa', 'Ổ khóa cửa bị kẹt.', 'HIGH', 'U001', 'NEW', 'Chưa phân công.', '2026-05-12 10:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO repair_images (id, repair_request_id, file_url, file_name, mime_type, sort_order)
VALUES
  ('RI001', 'RR001', '/uploads/repairs/may-lanh-1.jpg', 'may-lanh-1.jpg', 'image/jpeg', 1),
  ('RI002', 'RR001', '/uploads/repairs/may-lanh-2.jpg', 'may-lanh-2.jpg', 'image/jpeg', 2),
  ('RI003', 'RR002', '/uploads/repairs/ro-nuoc.jpg', 'ro-nuoc.jpg', 'image/jpeg', 1),
  ('RI004', 'RR004', '/uploads/repairs/khoa-1.jpg', 'khoa-1.jpg', 'image/jpeg', 1),
  ('RI005', 'RR004', '/uploads/repairs/khoa-2.jpg', 'khoa-2.jpg', 'image/jpeg', 2)
ON CONFLICT (id) DO NOTHING;
