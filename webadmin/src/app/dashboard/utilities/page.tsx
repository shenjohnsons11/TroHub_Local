"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, FileText } from "lucide-react";
import { toast } from "sonner";

export default function UtilitiesPage() {
  const [previews, setPreviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [utilitiesState, setUtilitiesState] = useState<Record<string, { electricity: string, water: string }>>({});

  const loadPreviews = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI("/invoices/bulk-preview");
      if (data.success && data.data) {
        setPreviews(data.data);
        const stateInit: any = {};
        data.data.forEach((p: any) => {
          stateInit[p.contractId] = { 
            electricity: p.electricityDraft ? p.electricityDraft.toString() : "", 
            water: p.waterDraft ? p.waterDraft.toString() : "" 
          };
        });
        setUtilitiesState(stateInit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreviews();
  }, []);

  const handleUpdateInput = (contractId: string, field: "electricity" | "water", value: string) => {
    setUtilitiesState(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], [field]: value }
    }));
  };

  const handleSaveBulk = async () => {
    setLoading(true);
    try {
      const utilitiesToUpdate = previews.map(p => {
        const inputState = utilitiesState[p.contractId];
        return {
          roomId: p.roomId,
          draftElectricity: inputState?.electricity,
          draftWater: inputState?.water
        };
      }).filter(item => item.draftElectricity || item.draftWater);

      if (utilitiesToUpdate.length === 0) {
        toast.warning("Vui lòng nhập số liệu mới cho ít nhất 1 phòng.");
        setLoading(false);
        return;
      }

      const res = await fetchAPI("/rooms/bulk-report-utility", {
        method: "POST",
        body: JSON.stringify({ utilities: utilitiesToUpdate }),
      });

      if (res.success) {
        toast.success(`Đã lưu trữ nháp sổ điện nước thành công! Mời qua trang Hóa Đơn để xuất hóa đơn.`);
        loadPreviews();
      } else {
        toast.error("Lỗi: " + res.message);
      }
    } catch (err: any) {
      toast.error("Lỗi khi lưu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPreviews = previews.filter(p => p.room?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Tìm theo mã phòng..." 
            className="pl-9 h-10 bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Button onClick={handleSaveBulk} disabled={loading} className="bg-[#f37021] hover:bg-[#e85f12] text-white">
          <Save className="w-4 h-4 mr-2" /> {loading ? "Đang xử lý..." : "Lưu sổ điện nước"}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Mã phòng</TableHead>
              <TableHead className="font-semibold text-slate-800">Tiền phòng</TableHead>
              <TableHead className="font-semibold text-slate-800">Số Điện cũ</TableHead>
              <TableHead className="font-semibold text-slate-800 text-blue-600 bg-blue-50/50">Số Điện mới</TableHead>
              <TableHead className="font-semibold text-slate-800">Số Nước cũ</TableHead>
              <TableHead className="font-semibold text-slate-800 text-blue-600 bg-blue-50/50">Số Nước mới</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Đang tải dữ liệu...
                </TableCell>
              </TableRow>
            ) : filteredPreviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Không tìm thấy phòng nào có hợp đồng đang hiệu lực.
                </TableCell>
              </TableRow>
            ) : (
              filteredPreviews.map((p) => (
                <TableRow key={p.contractId} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium">{p.room}</TableCell>
                  <TableCell>{p.roomAmount.toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell className="text-slate-500">{p.electricityOld}</TableCell>
                  <TableCell className="bg-blue-50/20">
                    <Input 
                      className="w-24 h-8 bg-white border-blue-200"
                      placeholder="Số mới"
                      type="number"
                      value={utilitiesState[p.contractId]?.electricity || ""}
                      onChange={(e) => handleUpdateInput(p.contractId, "electricity", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500">{p.waterOld}</TableCell>
                  <TableCell className="bg-blue-50/20">
                    <Input 
                      className="w-24 h-8 bg-white border-blue-200"
                      placeholder="Số mới"
                      type="number"
                      value={utilitiesState[p.contractId]?.water || ""}
                      onChange={(e) => handleUpdateInput(p.contractId, "water", e.target.value)}
                    />
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
