"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import { User, VehicleRequest } from "@/types";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("th-TH", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const statusLabels: Record<string, string> = {
  pending: "รอผู้บังคับบัญชาขั้นต้น",
  supervisor_approved: "รอผู้อนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDept, setFilterDept] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      setUser(await meRes.json());
      const reqRes = await fetch("/api/requests");
      if (reqRes.ok) setRequests(await reqRes.json());
      const deptRes = await fetch("/api/departments");
      if (deptRes.ok) {
        const depts = await deptRes.json();
        setDepartments(depts.filter((d: { is_active: boolean }) => d.is_active).map((d: { name: string }) => d.name));
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const handleDelete = async (reqId: string) => {
    if (!confirm("ยืนยันการลบรายการนี้?")) return;
    const res = await fetch(`/api/requests/${reqId}`, { method: "DELETE" });
    if (res.ok) {
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } else {
      alert("ลบไม่สำเร็จ");
    }
  };

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterName && !r.requester?.full_name?.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterDept && r.requester?.department !== filterDept) return false;
      if (filterDateFrom) {
        const dep = new Date(r.departure_datetime).toISOString().split("T")[0];
        if (dep < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const dep = new Date(r.departure_datetime).toISOString().split("T")[0];
        if (dep > filterDateTo) return false;
      }
      return true;
    });
  }, [requests, filterName, filterDateFrom, filterDateTo, filterDept]);

  // Reset page เมื่อ filter เปลี่ยน
  useEffect(() => { setCurrentPage(1); }, [filterName, filterDateFrom, filterDateTo, filterDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, currentPage]);

  const exportToExcel = useCallback(() => {
    const rows = filtered.map((r) => ({
      "วันที่ขอ": new Date(r.request_date).toLocaleDateString("th-TH"),
      "ผู้ขอ": r.requester?.full_name || "-",
      "กลุ่มงาน": r.requester?.department || "-",
      "วันเวลาออกเดินทาง": formatDateTime(r.departure_datetime),
      "วันเวลากลับถึง": formatDateTime(r.return_datetime),
      "สถานที่": r.destination,
      "เพื่อไป": r.purpose,
      "ผู้ร่วมเดินทาง": r.passengers || "-",
      "รถที่อนุมัติ": r.approved_vehicle ? `${r.approved_vehicle.brand} ${r.approved_vehicle.model} (${r.approved_vehicle.plate_number})` : "-",
      "ผู้ขับ": r.approved_driver_name || "-",
      "ผู้อนุมัติ": r.approver?.full_name || "-",
      "สถานะ": statusLabels[r.status] || r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายการขอใช้รถ");

    // ปรับความกว้างคอลัมน์
    ws["!cols"] = [
      { wch: 14 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 22 },
      { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 18 },
    ];

    XLSX.writeFile(wb, `รายการขอใช้รถ_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filtered]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">กำลังโหลด...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">รายการขอใช้รถยนต์ราชการ</h1>
          <div className="flex gap-2">
            <button onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm">
              📥 Export Excel
            </button>
            <Link href="/request/new" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition">
              + ขอใช้รถ
            </Link>
          </div>
        </div>

        {/* สรุปสถานะ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "ทั้งหมด", count: requests.length, color: "bg-gray-100", icon: "📋" },
            { label: "รอผู้บังคับบัญชา", count: requests.filter(r => r.status === "pending").length, color: "bg-yellow-100", icon: "⏳" },
            { label: "รอผู้อนุมัติ", count: requests.filter(r => r.status === "supervisor_approved").length, color: "bg-blue-100", icon: "📝" },
            { label: "อนุมัติแล้ว", count: requests.filter(r => r.status === "approved").length, color: "bg-green-100", icon: "✅" },
            { label: "ไม่อนุมัติ", count: requests.filter(r => r.status === "rejected").length, color: "bg-red-100", icon: "❌" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
              <p className="text-lg">{s.icon}</p>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="f_name" className="block text-xs font-medium text-gray-500 mb-1">ค้นหาชื่อผู้ขอ</label>
              <input id="f_name" type="text" value={filterName} onChange={e => setFilterName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="พิมพ์ชื่อ..." />
            </div>
            <div>
              <label htmlFor="f_from" className="block text-xs font-medium text-gray-500 mb-1">วันที่เดินทาง (จาก)</label>
              <input id="f_from" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="f_to" className="block text-xs font-medium text-gray-500 mb-1">วันที่เดินทาง (ถึง)</label>
              <input id="f_to" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="f_dept" className="block text-xs font-medium text-gray-500 mb-1">กลุ่มงาน</label>
              <select id="f_dept" value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">ทั้งหมด</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {(filterName || filterDateFrom || filterDateTo || filterDept) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500">แสดง {filtered.length} จาก {requests.length} รายการ</span>
              <button onClick={() => { setFilterName(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterDept(""); }}
                className="text-sm text-blue-600 hover:underline">ล้างตัวกรอง</button>
            </div>
          )}
        </div>

        {/* ตารางรายการ */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">วันที่ขอ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ผู้ขอ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">วันเวลาออก</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">วันเวลากลับ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">สถานที่</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">เพื่อไป</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ผู้ร่วมเดินทาง</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">รถ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ผู้ขับ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ผู้อนุมัติ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(r.request_date).toLocaleDateString("th-TH")}</td>
                    <td className="px-4 py-3">{r.requester?.full_name || "-"}</td>
                    <td className="px-4 py-3">{formatDateTime(r.departure_datetime)}</td>
                    <td className="px-4 py-3">{formatDateTime(r.return_datetime)}</td>
                    <td className="px-4 py-3">{r.destination}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{r.passengers || "-"}</td>
                    <td className="px-4 py-3">{r.approved_vehicle ? r.approved_vehicle.plate_number : "-"}</td>
                    <td className="px-4 py-3">{r.approved_driver_name || "-"}</td>
                    <td className="px-4 py-3">{r.approver?.full_name || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <Link href={`/request/${r.id}`} className="text-blue-600 hover:underline text-sm">ดูรายละเอียด</Link>
                      {user?.role === "admin" && (
                        <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:underline text-sm">ลบ</button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8 text-gray-400">ไม่มีรายการ</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                แสดง {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} จาก {filtered.length} รายการ
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >«</button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === "string" ? (
                      <span key={`dot-${i}`} className="px-1 text-gray-400 text-sm">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === p ? "bg-blue-700 text-white" : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >{p}</button>
                    )
                  )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >›</button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >»</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
