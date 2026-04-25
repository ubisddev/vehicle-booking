"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User } from "@/types";

interface Dept {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", is_active: true });

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const me = await meRes.json();
      if (me.role !== "admin") { router.push("/dashboard"); return; }
      setCurrentUser(me);
      loadDepts();
    }
    load();
  }, [router]);

  async function loadDepts() {
    const res = await fetch("/api/departments");
    if (res.ok) setDepartments(await res.json());
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/departments/${editId}` : "/api/departments";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setEditId(null);
      setForm({ name: "", is_active: true });
      loadDepts();
    } else {
      const data = await res.json();
      alert(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleEdit = (d: Dept) => {
    setEditId(d.id);
    setForm({ name: d.name, is_active: d.is_active });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบกลุ่มงาน?")) return;
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (res.ok) loadDepts();
    else alert("ลบไม่สำเร็จ อาจมีผู้ใช้อยู่ในกลุ่มงานนี้");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={currentUser} />
      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">จัดการกลุ่มงาน</h1>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", is_active: true }); }}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition">
            + เพิ่มกลุ่มงาน
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
            <div>
              <label htmlFor="dept_name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อกลุ่มงาน</label>
              <input id="dept_name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            {editId && (
              <div className="flex items-center gap-2">
                <input id="dept_active" type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <label htmlFor="dept_active" className="text-sm text-gray-700">ใช้งาน</label>
              </div>
            )}
            <div className="flex gap-3">
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อกลุ่มงาน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{d.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${d.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {d.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEdit(d)} className="text-blue-600 hover:underline text-sm">แก้ไข</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline text-sm">ลบ</button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-gray-400">ไม่มีกลุ่มงาน</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
