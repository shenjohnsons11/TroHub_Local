describe('TroHub Web Admin Login', () => {
  it('should successfully log in with admin account', () => {
    cy.visit('/');
    
    // Tìm ô nhập email theo đúng ID là "#login-email" và gõ tài khoản
    cy.get('#login-email').clear().type('admin@trohub.vn');
    
    // Tìm ô nhập mật khẩu theo đúng ID là "#login-password" và gõ mật khẩu
    cy.get('#login-password').clear().type('123456');
    
    // Bấm nút Đăng nhập dựa vào thuộc tính data-login
    cy.get('button[data-login]').click();
    
    // Kiểm tra xem đã đăng nhập thành công hay chưa
    cy.url().should('not.include', 'login');
  });
});
