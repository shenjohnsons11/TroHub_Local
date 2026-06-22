const email = "admin@trohub.vn";
const password = "123456";

async function login() {
  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password })
    });
    const text = await response.text();
    console.log("Raw Response Text:", text);
    const data = JSON.parse(text);
    console.log("Parsed Data:", data);

    if (!response.ok) {
      throw new Error(data?.message || "Có lỗi xảy ra khi gọi API");
    }

    if (!data.success || !data.token) {
      throw new Error(data.message || "Đăng nhập thất bại");
    }

    if (data.user.role !== 1 && data.user.role !== 2) {
      throw new Error("Tài khoản không có quyền truy cập ứng dụng");
    }

    console.log("Login SUCCESS!");
  } catch (err) {
    console.error("Caught error:", err);
  }
}
login();
