"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle } from "lucide-react";

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadRepairs = async () => {
    try {
      const data = await fetchAPI("/repairs");
      if (data.success) {
        setRepairs(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepairs();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetchAPI(`/repairs/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      loadRepairs();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã hoàn thành": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Đã hoàn thành</Badge>;
      case "Đang xử lý": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Đang xử lý</Badge>;
      case "Chờ tiếp nhận": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Chờ tiếp nhận</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRepairs = repairs.filter(r => 
    r.roomCode?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo phòng, nội dung..." 
            className="pl-9 h-10 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Ngày báo</TableHead>
              <TableHead className="font-semibold text-slate-800">Phòng</TableHead>
              <TableHead className="font-semibold text-slate-800">Nội dung</TableHead>
              <TableHead className="font-semibold text-slate-800">Chi phí dự kiến</TableHead>
              <TableHead className="font-semibold text-slate-800">Trạng thái</TableHead>
              <TableHead className="text-right font-semibold text-slate-800">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : filteredRepairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Không có yêu cầu sửa chữa nào</TableCell>
              </TableRow>
            ) : (
              filteredRepairs.map(repair => (
                <TableRow key={repair._id || repair.id}>
                  <TableCell className="font-medium text-slate-900">{repair.date || "Hôm nay"}</TableCell>
                  <TableCell>{repair.roomCode}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{repair.content}</TableCell>
                  <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(repair.cost || 0)}</TableCell>
                  <TableCell>{getStatusBadge(repair.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {repair.status === "Chờ tiếp nhận" && (
                        <Button onClick={() => handleUpdateStatus(repair._id || repair.id, "Đang xử lý")} variant="ghost" size="icon" title="Tiếp nhận sửa chữa" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {repair.status === "Đang xử lý" && (
                        <Button onClick={() => handleUpdateStatus(repair._id || repair.id, "Đã hoàn thành")} variant="ghost" size="icon" title="Xác nhận hoàn thành" className="h-8 w-8 text-green-500 hover:text-green-700 hover:bg-green-50">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
