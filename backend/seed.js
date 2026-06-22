const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs"); // Sử dụng bcryptjs để mã hóa mật khẩu

async function seed() {
  const uri = "mongodb://127.0.0.1:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("trohub");
    const accounts = db.collection("accounts");

    // Xóa hết tài khoản cũ không hợp lệ
    await accounts.deleteMany({});

    // Tạo mật khẩu mã hóa
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    // Chèn tài khoản Admin (Chủ trọ - role 1)
    await accounts.insertOne({
      username: "admin@trohub.vn",
      password: hashedPassword,
      fullName: "Admin Chủ Trọ",
      phone: "0901234567",
      email: "admin@trohub.vn",
      role: 1, // 1 là Chủ trọ theo Backend đồng nghiệp
      status: 1
    });

    // Chèn tài khoản Khách thuê (role 2)
    await accounts.insertOne({
      username: "tenant@trohub.vn",
      password: hashedPassword,
      fullName: "Khách Thuê Demo",
      phone: "0987654321",
      email: "tenant@trohub.vn",
      role: 2, // 2 là Khách thuê
      status: 1
    });

    console.log("✅ Đã cập nhật xong dữ liệu mẫu (mã hóa mật khẩu) cho Backend mới!");
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    await client.close();
  }
}

seed();
