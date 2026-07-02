"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, RefreshCw, Bell } from "lucide-react";

interface Debt {
  contractId: string;
  room: string;
  tenant: string;
  totalDebt: number;
  unpaidInvoiceCount: number;
  invoices: any[];
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadDebts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("trohub_token");
      const res = await fetch("http://localhost:3000/api/invoices/debts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDebts(data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách công nợ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const handleRemind = async (contractId: string) => {
    try {
      const token = localStorage.getItem("trohub_token");
      const res = await fetch(`http://localhost:3000/api/invoices/debts/${contractId}/remind`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert("Đã gửi thông báo nhắc nợ thành công!");
      } else {
        alert("Lỗi: " + data.message);
      }
    } catch (error) {
      alert("Lỗi kết nối khi gửi nhắc nợ");
    }
  };

  const filteredDebts = debts.filter(d => 
    (d.room || "").toLowerCase().includes(search.toLowerCase()) || 
    (d.tenant || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalSystemDebt = debts.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Công nợ</h1>
          <p className="text-slate-500 mt-1">Theo dõi tổng tiền khách đang nợ</p>
        </div>
        <button onClick={loadDebts} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tổng công nợ hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">
              {totalSystemDebt.toLocaleString("vi-VN")} đ
            </div>
            <p className="text-red-500 text-xs mt-1">
              Từ {debts.length} phòng đang nợ
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg text-slate-800">Danh sách nợ theo phòng</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Tìm theo phòng hoặc khách..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[150px] font-semibold text-slate-600">Phòng</TableHead>
                  <TableHead className="font-semibold text-slate-600">Khách thuê</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Số hóa đơn nợ</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Tổng nợ</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <AlertCircle className="w-6 h-6 text-slate-400" />
                        </div>
                        <p>Không có công nợ nào cần thu</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebts.map((debt) => (
                    <TableRow key={debt.contractId} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-900">{debt.room}</TableCell>
                      <TableCell className="text-slate-600">{debt.tenant}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {debt.unpaidInvoiceCount} hóa đơn
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {debt.totalDebt.toLocaleString("vi-VN")} đ
                      </TableCell>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => handleRemind(debt.contractId)}
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                          title="Gửi nhắc nợ"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
