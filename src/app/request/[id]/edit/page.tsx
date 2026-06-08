"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, VehicleRequest, Vehicle } from "@/types";

function toLocalInput(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditRequestPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    departure_datetime: "",
    return_datetime: "",
    destination: "",
    purpose: "",
    passengers: "",
    approved_vehicle_id: "",
    approved_driver_name: "",
  });

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const me = await meRes.json();
      if (me.role !== "admin" && me.role !== "approver") {
        router.push("/dashboard"); return;
      }
      setUser(me);

      const reqRes = await fetch(`/api/requests/${id}`);
      if (reqRes.ok) {
        const req: VehicleRequest = await reqRes.json();
        setForm({
          departure_datetime: toLocalInput(req.departure_datetime),
          return_datetime: toLocalInput(req.return_datetime),
          destination: req.destination,
          purpose: req.purpose,
          passengers: req.passengers || "",
          approved_vehicle_id: req.approved_vehicle_id || "",
          approved_driver_name: req.approved_driver_name || "",
        });
      }

      const vehRes = await fetch("/api/vehicles");
      if (vehRes.ok) setVehicles((await vehRes.json()).filter((v: Vehicle) => v.is_active));

      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        departure_datetime: form.departure_datetime ? form.departure_datetime + ":00+07:00" : "",
        return_datetime: form.return_datetime ? form.return_datetime + ":00+07:00" : "",
      }),
    });

    if (res.ok) {
      router.push(`/request/${id}`);
    } else {
      const data = await res.json();
      alert(data.error || "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">กำลังโหลด...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">แก้ไขรายการขอใช้รถ</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
          <div>
            <label htmlFor="dep" className="block text-sm font-medium text-gray-700 mb-1">วันเวลาออกเดินทาง</label>
            <input id="dep" type="datetime-local" value={form.departure_datetime}
              onChange={e => setForm({ ...form, departure_datetime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label htmlFor="ret" className="block text-sm font-medium text-gray-700 mb-1">วันเวลากลับถึงหน่วยงาน</label>
            <input id="ret" type="datetime-local" value={form.return_datetime}
              onChange={e => setForm({ ...form, return_datetime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label htmlFor="dest" className="block text-sm font-medium text-gray-700 mb-1">สถานที่เดินทางไป</label>
            <input id="dest" type="text" value={form.destination}
              onChange={e => setForm({ ...form, destination: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (เพื่อไป...)</label>
            <textarea id="purpose" value={form.purpose}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" rows={3} required />
          </div>
          <div>
            <label htmlFor="passengers" className="block text-sm font-medium text-gray-700 mb-1">ผู้ร่วมเดินทาง</label>
            <textarea id="passengers" value={form.passengers}
              onChange={e => setForm({ ...form, passengers: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
          </div>
          <div>
            <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 mb-1">รถที่อนุมัติ</label>
            <select id="vehicle" value={form.approved_vehicle_id}
              onChange={e => setForm({ ...form, approved_vehicle_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none">
              <option value="">-- ไม่ระบุ --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="driver" className="block text-sm font-medium text-gray-700 mb-1">ผู้ขับที่อนุมัติ</label>
            <input id="driver" type="text" value={form.approved_driver_name}
              onChange={e => setForm({ ...form, approved_driver_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="ชื่อผู้ขับรถ" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg transition disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <Link href={`/request/${id}`}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2.5 rounded-lg transition">
              ยกเลิก
            </Link>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
