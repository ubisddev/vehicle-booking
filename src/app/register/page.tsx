"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function RegisterPage() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [form, setForm] = useState({
    email: "", password: "", confirm_password: "",
    full_name: "", position: "", department: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(data => {
      const active = data.filter((d: { is_active: boolean }) => d.is_active).map((d: { name: string }) => d.name);
      setDepartments(active);
      if (active.length > 0) setForm(f => ({ ...f, department: active[0] }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (form.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          position: form.position,
          department: form.department,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "สมัครไม่สำเร็จ");
        return;
      }
      setSuccess(true);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-800 to-blue-950">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-green-700 mb-2">สมัครสำเร็จ</h1>
          <p className="text-gray-600 mb-6">กรุณารอผู้ดูแลระบบอนุมัติบัญชีของท่าน<br/>จึงจะสามารถเข้าสู่ระบบได้</p>
          <Link href="/login" className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg transition inline-block">
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-800 to-blue-950">
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🚗</div>
            <h1 className="text-2xl font-bold text-blue-800">สมัครผู้ใช้งาน</h1>
            <p className="text-gray-500 mt-1">AI-UBISD Vehicle Intelligent System สพร.7 อุบลราชธานี</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

            <div>
              <label htmlFor="reg_name" className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-สกุล</label>
              <input id="reg_name" type="text" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น นายสมชาย ใจดี" required />
            </div>
            <div>
              <label htmlFor="reg_email" className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input id="reg_email" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="email@example.com" required />
            </div>
            <div>
              <label htmlFor="reg_pos" className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
              <input id="reg_pos" type="text" value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="เช่น นักวิชาการพัฒนาฝีมือแรงงาน" required />
            </div>
            <div>
              <label htmlFor="reg_dept" className="block text-sm font-medium text-gray-700 mb-1">กลุ่มงาน</label>
              <select id="reg_dept" value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="reg_pass" className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <input id="reg_pass" type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="อย่างน้อย 6 ตัวอักษร" required />
            </div>
            <div>
              <label htmlFor="reg_pass2" className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
              <input id="reg_pass2" type="password" value={form.confirm_password}
                onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="กรอกรหัสผ่านอีกครั้ง" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">
              {loading ? "กำลังสมัคร..." : "สมัครผู้ใช้งาน"}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              มีบัญชีแล้ว? <Link href="/login" className="text-blue-600 hover:underline">เข้าสู่ระบบ</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
