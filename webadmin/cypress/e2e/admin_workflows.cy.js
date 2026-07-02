describe('Admin Workflows: Room, Tenant, Contract', () => {
  beforeEach(() => {
    // Đăng nhập trước mỗi bài test
    cy.visit('/');
    cy.get('#login-email').clear().type('admin@trohub.vn');
    cy.get('#login-password').clear().type('123456');
    cy.get('button[data-login]').click();
    cy.url().should('not.include', 'login');
  });

  it('Thêm phòng trọ mới', () => {
    // Bấm menu Quản lý phòng
    cy.contains('Phòng trọ').click();
    // Bấm nút thêm phòng
    cy.contains('+ Thêm phòng').click();
    
    // Điền form
    const randomRoom = `A${Math.floor(Math.random() * 1000)}`; // Tránh trùng mã phòng
    cy.get('input[data-field="id"]').type(randomRoom);
    cy.get('input[data-field="area"]').type('25');
    cy.get('input[data-field="rent"]').clear().type('3000000');
    cy.get('input[data-field="deposit"]').clear().type('3000000');
    
    // Lưu phòng
    cy.get('button[data-action="save-room"]').click();
    
    // Đảm bảo thông báo hoặc quay lại danh sách
    cy.contains(randomRoom, { timeout: 15000 }).should('exist');
  });

  it('Thêm tài khoản khách thuê mới', () => {
    // Bấm menu Khách thuê
    cy.contains('Khách thuê').click();
    cy.contains('+ Thêm khách').click();

    // Điền form
    const randomSuffix = Math.floor(Math.random() * 1000);
    const tenantName = `Khach Cypress ${randomSuffix}`;
    
    cy.get('input[data-field="email"]').type(`tenant_${randomSuffix}@trohub.vn`);
    cy.get('input[data-field="phone"]').type(`0123456${randomSuffix.toString().padStart(3, '0')}`);
    cy.get('input[data-field="name"]').type(tenantName);
    cy.get('input[data-field="citizenId"]').type('123456789012');
    
    // Lưu khách
    cy.get('button[data-action="save-tenant"]').click();
    
    // Đảm bảo khách hiển thị
    cy.contains(tenantName, { timeout: 15000 }).should('exist');
  });

  it('Tạo hợp đồng', () => {
    // Bấm menu Hợp đồng
    cy.contains('Hợp đồng').click();
    cy.get('button[data-action="add-contract"]').click();

    // Bỏ qua bước nhập ngày vì hệ thống đã tự sinh ngày mặc định (readonly input)
    cy.get('input[data-field="rent"]').clear().type('3000000');
    cy.get('input[data-field="deposit"]').clear().type('3000000');
    
    // Lưu hợp đồng
    cy.get('button[data-action="create-contract"]').click();
  });

  it('Lập hóa đơn hàng loạt', () => {
    cy.contains('Hóa đơn').click();
    cy.contains('+ Tạo hóa đơn').click();
    
    // Điền chỉ số điện nước mới cho phòng đầu tiên (nếu có hợp đồng)
    cy.get('body').then($body => {
      if ($body.find('input[data-field="electricityNew"]').length > 0) {
        cy.get('input[data-field="electricityNew"]').first().type('150');
        cy.get('input[data-field="waterNew"]').first().type('50');
        cy.get('button[data-action="export-bulk-invoice"]').click();
        cy.contains('Quản lý hóa đơn').should('exist');
      }
    });
  });

  it('Xem danh sách sửa chữa', () => {
    cy.contains('Sửa chữa').click();
    cy.contains('Yêu cầu sửa chữa').should('exist');
  });
});
