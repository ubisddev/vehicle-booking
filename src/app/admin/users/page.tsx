"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Department, Role } from "@/types";

const departments: Department[] = [
  "ฝ่ายบริหารทั่วไป",
  "กลุ่มงานพัฒนาฝีมือแรงงาน",
  "กลุ่มงานมาตรฐานฝีมือแรงงานและรับรองความรู้ความสามารถ",
  "กลุ่มงานแผนงานและสารสนเทศ",
];

const roles: { value: Role; label: string }[] = [
  { value: "user", label: "ผู้ใช้ทั่วไป" },
  { value: "supervisor", label: "ผู้บังคับบัญชาขั้นต้น" },
  { value: "approver", label: "ผู้อนุมัติ" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
];

const emptyForm = { email: "", password: "", full_name: "", position: "", department: departments[0] as string, role: "user" as string };

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
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
      loadUsers();
    }
    load();
  }, [router]);

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/users/${editId}` : "/api/users";
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
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleEdit = (u: User) => {
    setEditId(u.id);
    setForm({ email: u.email, password: "", full_name: u.full_name, position: u.position, department: u.department, role: u.role });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบผู้ใช้?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/users/${id}/approve`, { method: "POST" });
    if (res.ok) loadUsers();
    else alert("เกิดข้อผิดพลาด");
  };

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={currentUser} />
      <div className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้</h1>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition"
          >
            + เพิ่มผู้ใช้
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="uf_email" className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input id="uf_email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div>
              <label htmlFor="uf_pass" className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน {editId && "(เว้นว่างถ้าไม่เปลี่ยน)"}</label>
              <input id="uf_pass" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" {...(!editId && { required: true })} />
            </div>
            <div>
              <label htmlFor="uf_name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-สกุล</label>
              <input id="uf_name" type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div>
              <label htmlFor="uf_pos" className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
              <input id="uf_pos" type="text" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none" required />
            </div>
            <div>
              <label htmlFor="uf_dept" className="block text-sm font-medium text-gray-700 mb-1">กลุ่มงาน</label>
              <select id="uf_dept" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="uf_role" className="block text-sm font-medium text-gray-700 mb-1">บทบาท</label>
              <select id="uf_role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 outline-none">
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
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

        {/* รอการอนุมัติ */}
        {pendingUsers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-orange-600 mb-3">⏳ รอการอนุมัติ ({pendingUsers.length})</h2>
            <div className="bg-white rounded-xl shadow overflow-hidden border-2 border-orange-200">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">อีเมล</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ตำแหน่ง</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">กลุ่มงาน</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingUsers.map(u => (
                    <tr key={u.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3">{u.full_name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.position}</td>
                      <td className="px-4 py-3 text-xs">{u.department}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => handleApprove(u.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition">อนุมัติ</button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline text-sm">ลบ</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ผู้ใช้ทั้งหมด */}
        <h2 className="text-lg font-bold text-gray-700 mb-3">ผู้ใช้ทั้งหมด ({approvedUsers.length})</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">อีเมล</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ตำแหน่ง</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">กลุ่มงาน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">บทบาท</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvedUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.position}</td>
                  <td className="px-4 py-3 text-xs">{u.department}</td>
                  <td className="px-4 py-3">{roles.find(r => r.value === u.role)?.label}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEdit(u)} className="text-blue-600 hover:underline text-sm">แก้ไข</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline text-sm">ลบ</button>
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
