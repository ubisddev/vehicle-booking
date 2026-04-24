"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Vehicle } from "@/types";

const emptyForm = { plate_number: "", brand: "", model: "", vehicle_type: "", is_active: true };

export default function AdminVehiclesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const me = await meRes.json();
      if (me.role !== "admin") { router.push("/dashboard"); return; }
      setCurrentUser(me);
      loadVehicles();
    }
    load();
  }, [router]);

  async function loadVehicles() {
    const res = await fetch("/api/vehicles");
    if (res.ok) setVehicles(await res.json());
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/vehicles/${editId}` : "/api/vehicles";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      loadVehicles();
    } else {
      const data = await res.json();
      alert(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({ plate_number: v.plate_number, brand: v.brand, model: v.model, vehicle_type: v.vehicle_type, is_active: v.is_active });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบรถยนต์?")) return;
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    loadVehicles();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={currentUser} />
      <div className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">จัดการรถยนต์</h1>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition"
          >
            + เพิ่มรถยนต์
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="vf_plate" className="block text-sm font-medium text-gray-700 mb-1">ทะเบียนรถ</label>
              <input id="vf_plate" type="text" value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div>
              <label htmlFor="vf_brand" className="block text-sm font-medium text-gray-700 mb-1">ยี่ห้อ</label>
              <input id="vf_brand" type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div>
              <label htmlFor="vf_model" className="block text-sm font-medium text-gray-700 mb-1">รุ่น</label>
              <input id="vf_model" type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div>
              <label htmlFor="vf_type" className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
              <input id="vf_type" type="text" value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" placeholder="เช่น รถตู้, รถเก๋ง, กระบะ" required />
            </div>
            <div className="flex items-center gap-2">
              <input id="vf_active" type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <label htmlFor="vf_active" className="text-sm text-gray-700">ใช้งานได้</label>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition">
                {editId ? "บันทึก" : "เพิ่ม"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-lg transition">ยกเลิก</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ทะเบียน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ยี่ห้อ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">รุ่น</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ประเภท</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{v.plate_number}</td>
                  <td className="px-4 py-3">{v.brand}</td>
                  <td className="px-4 py-3">{v.model}</td>
                  <td className="px-4 py-3">{v.vehicle_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${v.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {v.is_active ? "ใช้งานได้" : "ไม่ใช้งาน"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEdit(v)} className="text-blue-600 hover:underline text-sm">แก้ไข</button>
                    <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:underline text-sm">ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
