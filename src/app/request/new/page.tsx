"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SignaturePad from "@/components/SignaturePad";
import { User } from "@/types";

export default function NewRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    departure_datetime: "",
    return_datetime: "",
    destination: "",
    purpose: "",
    passengers: "",
    requester_signature: "",
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => {
      if (!r.ok) { router.push("/login"); return; }
      return r.json();
    }).then(d => d && setUser(d));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      alert(data.error || "เกิดข้อผิดพลาด");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">แบบขอใช้รถยนต์ราชการ</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
          <div>
            <label htmlFor="departure" className="block text-sm font-medium text-gray-700 mb-1">
              วันเวลาออกเดินทาง
            </label>
            <input
              id="departure"
              type="datetime-local"
              value={form.departure_datetime}
              onChange={(e) => setForm({ ...form, departure_datetime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="return" className="block text-sm font-medium text-gray-700 mb-1">
              วันเวลากลับถึงหน่วยงาน
            </label>
            <input
              id="return"
              type="datetime-local"
              value={form.return_datetime}
              onChange={(e) => setForm({ ...form, return_datetime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
              สถานที่เดินทางไป
            </label>
            <input
              id="destination"
              type="text"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="เช่น ศาลากลางจังหวัดอุบลราชธานี"
              required
            />
          </div>

          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียดการเดินทาง (เพื่อไป...)
            </label>
            <textarea
              id="purpose"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="เช่น ประชุมคณะกรรมการพัฒนาฝีมือแรงงาน"
              required
            />
          </div>

          <div>
            <label htmlFor="passengers" className="block text-sm font-medium text-gray-700 mb-1">
              ผู้ร่วมเดินทาง
            </label>
            <textarea
              id="passengers"
              value={form.passengers}
              onChange={(e) => setForm({ ...form, passengers: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="เช่น 1. นายสมชาย ใจดี 2. นางสาวสมหญิง รักดี"
            />
          </div>

          <SignaturePad
            label="ลงลายเซ็นผู้ขอ"
            onSave={(sig) => setForm({ ...form, requester_signature: sig })}
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "กำลังส่ง..." : "ส่งคำขอ"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2.5 rounded-lg transition"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
