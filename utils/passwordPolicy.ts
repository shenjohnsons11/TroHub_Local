export function getPasswordPolicyError(password: string): string {
  if (password.length < 10) return "Mật khẩu phải có ít nhất 10 ký tự.";
  if (!/[A-Z]/.test(password)) return "Mật khẩu cần ít nhất một chữ hoa.";
  if (!/[a-z]/.test(password)) return "Mật khẩu cần ít nhất một chữ thường.";
  if (!/\d/.test(password)) return "Mật khẩu cần ít nhất một chữ số.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Mật khẩu cần ít nhất một ký tự đặc biệt.";
  }
  return "";
}
