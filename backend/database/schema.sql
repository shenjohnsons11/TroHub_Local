-- TroHub database schema v2
-- Recommended database: PostgreSQL
-- Main correction: landlord and tenant are both stored in users, separated by role.

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) UNIQUE,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('LANDLORD', 'TENANT')),
  citizen_id VARCHAR(50),
  bank_name VARCHAR(120),
  bank_account VARCHAR(80),
  address TEXT,
  emergency_contact VARCHAR(80),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boarding_houses (
  id VARCHAR(36) PRIMARY KEY,
  owner_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(160) NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'SOLD')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id VARCHAR(36) PRIMARY KEY,
  house_id VARCHAR(36) REFERENCES boarding_houses(id),
  owner_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  area_m2 NUMERIC(10, 2),
  rent_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  max_occupants INT NOT NULL DEFAULT 1,
  current_occupants INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE')),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_user_id, code)
);

CREATE TABLE contracts (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  room_id VARCHAR(36) NOT NULL REFERENCES rooms(id),
  landlord_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  tenant_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  sign_date DATE NOT NULL,
  rent_start_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  electricity_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  electricity_start_index NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_start_index NUMERIC(14, 2) NOT NULL DEFAULT 0,
  electricity_current_index NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_current_index NUMERIC(14, 2) NOT NULL DEFAULT 0,
  vehicle_count INT NOT NULL DEFAULT 0,
  vehicle_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  internet_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  trash_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  extra_terms TEXT,
  tenant_accepted_at TIMESTAMP,
  landlord_accepted_at TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_TENANT', 'PENDING_LANDLORD', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contract_occupants (
  id VARCHAR(36) PRIMARY KEY,
  contract_id VARCHAR(36) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  citizen_id VARCHAR(50),
  relationship VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  default_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE invoices (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  room_id VARCHAR(36) NOT NULL REFERENCES rooms(id),
  landlord_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  tenant_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  contract_id VARCHAR(36) REFERENCES contracts(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  due_date DATE NOT NULL,
  room_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  electricity_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  water_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  service_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  penalty_days INT NOT NULL DEFAULT 0,
  penalty_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  penalty_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(40),
  transaction_code VARCHAR(160),
  paid_at TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('DRAFT', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_details (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_id VARCHAR(36) REFERENCES services(id),
  label VARCHAR(120) NOT NULL,
  quantity NUMERIC(14, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE meter_readings (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL REFERENCES rooms(id),
  contract_id VARCHAR(36) REFERENCES contracts(id),
  invoice_id VARCHAR(36) REFERENCES invoices(id),
  type VARCHAR(30) NOT NULL CHECK (type IN ('ELECTRICITY', 'WATER')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  previous_index NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_index NUMERIC(14, 2) NOT NULL DEFAULT 0,
  usage_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id),
  payer_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  method VARCHAR(40) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transaction_code VARCHAR(160),
  penalty_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repair_requests (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  room_id VARCHAR(36) NOT NULL REFERENCES rooms(id),
  requester_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'UNSET' CHECK (priority IN ('UNSET', 'LOW', 'MEDIUM', 'HIGH')),
  priority_set_by VARCHAR(36) REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  landlord_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repair_images (
  id VARCHAR(36) PRIMARY KEY,
  repair_request_id VARCHAR(36) NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(120),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repair_histories (
  id VARCHAR(36) PRIMARY KEY,
  repair_request_id VARCHAR(36) NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  note TEXT,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'UNREAD',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_houses_owner_status ON boarding_houses(owner_user_id, status);
CREATE INDEX idx_rooms_owner_status ON rooms(owner_user_id, status);
CREATE INDEX idx_contracts_room_status ON contracts(room_id, status);
CREATE INDEX idx_contracts_tenant_status ON contracts(tenant_user_id, status);
CREATE INDEX idx_invoices_room_range ON invoices(room_id, from_date, to_date);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_user_id, status);
CREATE INDEX idx_meter_readings_room_range ON meter_readings(room_id, from_date, to_date);
CREATE INDEX idx_payments_invoice_status ON payments(invoice_id, status);
CREATE INDEX idx_repair_requests_room_status ON repair_requests(room_id, status);
CREATE INDEX idx_repair_images_request ON repair_images(repair_request_id);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
