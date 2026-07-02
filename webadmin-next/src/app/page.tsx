"use client";

import { useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatPhoneInput, formatIdCardInput, parseFormattedString } from "@/lib/utils";

export default function LoginPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Register states
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regIdCard, setRegIdCard] = useState("");
  const [regPassword, setRegPassword] = useState("");
  // Web Admin registration is strictly for Landlords (role 1)
  const regRole = 1;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const data = await fetchAPI("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: regFullName,
          phone: parseFormattedString(regPhone),
          email: regEmail,
          username: regEmail,
          idCard: parseFormattedString(regIdCard),
          password: regPassword,
          role: regRole
        }),
      });

      if (data.success) {
        setSuccessMsg("Đăng ký thành công! Vui lòng đăng nhập.");
        setShowRegister(false);
        setEmail(regPhone || regEmail);
        setPassword(regPassword);
      }
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: email, password }),
      });

      if (data.success) {
        const user = data.user || data.data;
        if (user.role === 2) {
          setError("Tài khoản Khách thuê vui lòng đăng nhập trên Mobile App.");
          setLoading(false);
          return;
        }
        localStorage.setItem("trohub_token", data.token);
        localStorage.setItem("trohub_user", JSON.stringify(user));
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-50 flex flex-col md:flex-row p-4 md:p-12 items-center gap-12">
      <div className="flex-1 flex flex-col justify-center max-w-xl">
        <div className="w-16 h-16 bg-[#f37021] text-white rounded-[18px] flex items-center justify-center font-black text-2xl mb-6">
          TH
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Quản lý phòng trọ dễ dàng hơn</h1>
        <p className="text-slate-500 text-lg leading-relaxed mb-8">
          TroHub giúp chủ trọ và khách thuê theo dõi phòng, hợp đồng, hóa đơn, điện nước và sửa chữa trong một hệ thống thống nhất.
        </p>
        <div className="flex gap-2 opacity-50">
          {[40, 60, 30, 80, 50, 45].map((h, i) => (
            <div key={i} style={{ height: `${h}px` }} className="w-8 bg-[#f37021] rounded-t-sm self-end" />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_16px_42px_rgba(31,41,55,0.08)] border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#f37021] text-white rounded-xl flex items-center justify-center font-bold text-sm">
            TH
          </div>
          <strong className="text-[#f37021] text-xl">TroHub</strong>
        </div>

        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setShowRegister(false)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${!showRegister ? 'bg-[#f37021] text-white' : 'bg-orange-50 text-[#f37021] hover:bg-orange-100'}`}
          >
            Đăng nhập
          </button>
          <button 
            onClick={() => setShowRegister(true)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${showRegister ? 'bg-[#f37021] text-white' : 'bg-orange-50 text-[#f37021] hover:bg-orange-100'}`}
          >
            Đăng ký
          </button>
        </div>

        {!showRegister ? (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng nhập hệ thống</h2>
            <p className="text-slate-500 mb-6">Đăng nhập bằng tài khoản chủ trọ hoặc người thuê.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Tên đăng nhập</Label>
                <Input 
                  id="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Nhập số điện thoại hoặc email" 
                  className="h-11 focus-visible:ring-[#f37021]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Mật khẩu</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu" 
                  className="h-11 focus-visible:ring-[#f37021]" 
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="remember" className="w-4 h-4 accent-[#f37021]" defaultChecked />
                <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">Ghi nhớ đăng nhập</label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 font-medium">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-green-50 text-green-600 text-sm rounded border border-green-100 font-medium">
                  {successMsg}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 bg-[#f37021] hover:bg-[#e85f12] text-white font-bold text-base rounded-xl">
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            <div className="mt-8 p-4 bg-orange-50 rounded-xl border border-orange-100 text-sm">
              <b className="block text-slate-800 mb-2">Tài khoản mẫu</b>
              <div className="text-slate-600 space-y-1">
                <p>Admin: <span className="font-medium text-slate-800">admin@trohub.vn / 123456</span></p>
                <p>Khách: <span className="font-medium text-slate-800">tenant@trohub.vn / 123456</span></p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng ký tài khoản mới</h2>
            <p className="text-slate-500 mb-6">Đăng ký tài khoản chủ trọ.</p>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regFullName" className="text-slate-700">Họ tên *</Label>
                  <Input id="regFullName" value={regFullName} onChange={e => setRegFullName(e.target.value)} required placeholder="Nguyễn Văn A" className="h-10 focus-visible:ring-[#f37021]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPhone" className="text-slate-700">Số điện thoại *</Label>
                  <Input id="regPhone" value={regPhone} onChange={e => setRegPhone(formatPhoneInput(e.target.value))} required placeholder="090.123.4567" className="h-10 focus-visible:ring-[#f37021]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regEmail" className="text-slate-700">Email (Tên đăng nhập) *</Label>
                <Input id="regEmail" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="email@example.com" className="h-10 focus-visible:ring-[#f37021]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regIdCard" className="text-slate-700">CCCD</Label>
                <Input id="regIdCard" value={regIdCard} onChange={e => setRegIdCard(formatIdCardInput(e.target.value))} placeholder="079.012.345.678" className="h-10 focus-visible:ring-[#f37021]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regPassword" className="text-slate-700">Mật khẩu *</Label>
                <Input id="regPassword" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="Ít nhất 6 ký tự" className="h-10 focus-visible:ring-[#f37021]" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 bg-[#f37021] hover:bg-[#e85f12] text-white font-bold text-base rounded-xl mt-2">
                {loading ? "Đang đăng ký..." : "Đăng ký tài khoản"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
