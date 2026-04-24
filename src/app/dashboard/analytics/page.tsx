"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, VehicleRequest } from "@/types";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      setUser(await meRes.json());
      const reqRes = await fetch("/api/requests");
      if (reqRes.ok) setRequests(await reqRes.json());
      setLoading(false);
    }
    load();
  }, [router]);

  const analytics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisMonth = requests.filter(r => {
      const d = new Date(r.request_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const thisYear = requests.filter(r => new Date(r.request_date).getFullYear() === currentYear);

    const monthlyData: { month: string; count: number; approved: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const inMonth = requests.filter(r => {
        const rd = new Date(r.request_date);
        return rd.getFullYear() === y && rd.getMonth() === m;
      });
      monthlyData.push({
        month: `${THAI_MONTHS[m]} ${(y + 543).toString().slice(-2)}`,
        count: inMonth.length,
        approved: inMonth.filter(r => r.status === "approved").length,
      });
    }

    const byDept: Record<string, number> = {};
    requests.forEach(r => {
      const dept = r.requester?.department || "ไม่ระบุ";
      byDept[dept] = (byDept[dept] || 0) + 1;
    });

    const byDest: Record<string, number> = {};
    requests.forEach(r => { byDest[r.destination] = (byDest[r.destination] || 0) + 1; });
    const topDestinations = Object.entries(byDest).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const byVehicle: Record<string, number> = {};
    requests.forEach(r => {
      if (r.approved_vehicle) {
        const label = r.approved_vehicle.plate_number;
        byVehicle[label] = (byVehicle[label] || 0) + 1;
      }
    });
    const topVehicles = Object.entries(byVehicle).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

    return { thisMonth, thisYear, monthlyData, byDept, topDestinations, topVehicles, maxMonthly };
  }, [requests]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">กำลังโหลด...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 สรุปสถิติการขอใช้รถยนต์</h1>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* กราฟรายเดือน */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-bold text-gray-700 mb-4">สรุปรายเดือน (12 เดือนล่าสุด)</h2>
            <div className="flex items-end gap-1.5 h-40">
              {analytics.monthlyData.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{m.count}</span>
                  <div className="w-full flex flex-col items-center gap-0.5">
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(m.count / analytics.maxMonthly) * 100}px`, minHeight: m.count > 0 ? "4px" : "0" }} />
                    <div className="w-full bg-green-400 rounded-b" style={{ height: `${(m.approved / analytics.maxMonthly) * 100}px`, minHeight: m.approved > 0 ? "4px" : "0" }} />
                  </div>
                  <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap mt-1">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded inline-block" /> คำขอทั้งหมด</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block" /> อนุมัติแล้ว</span>
            </div>
          </div>

          {/* สรุปตามกลุ่มงาน */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-bold text-gray-700 mb-4">🏢 สรุปตามกลุ่มงาน</h2>
            <div className="space-y-3">
              {Object.entries(analytics.byDept).map(([dept, count]) => {
                const maxDept = Math.max(...Object.values(analytics.byDept), 1);
                return (
                  <div key={dept}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate mr-2">{dept}</span>
                      <span className="font-medium text-gray-800 shrink-0">{count} ครั้ง</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${(count / maxDept) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(analytics.byDept).length === 0 && <p className="text-gray-400 text-sm">ยังไม่มีข้อมูล</p>}
            </div>
          </div>

          {/* สถานที่ยอดนิยม */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-bold text-gray-700 mb-4">📍 สถานที่เดินทางบ่อย (Top 5)</h2>
            {analytics.topDestinations.length > 0 ? (
              <div className="space-y-2">
                {analytics.topDestinations.map(([dest, count], i) => (
                  <div key={dest} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{dest}</span>
                    <span className="text-sm font-medium text-gray-500 shrink-0">{count} ครั้ง</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm">ยังไม่มีข้อมูล</p>}
          </div>

          {/* รถที่ใช้บ่อย + สรุปเดือน/ปี */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-bold text-gray-700 mb-4">🚗 รถที่ใช้บ่อย (Top 5)</h2>
            {analytics.topVehicles.length > 0 ? (
              <div className="space-y-2 mb-5">
                {analytics.topVehicles.map(([v, count], i) => (
                  <div key={v} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1">{v}</span>
                    <span className="text-sm font-medium text-gray-500 shrink-0">{count} ครั้ง</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm mb-5">ยังไม่มีข้อมูล</p>}
            <hr className="mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{analytics.thisMonth.length}</p>
                <p className="text-xs text-gray-500">คำขอเดือนนี้</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">{analytics.thisYear.length}</p>
                <p className="text-xs text-gray-500">คำขอปีนี้</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
