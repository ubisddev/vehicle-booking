import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

interface MatchResult {
  matched: boolean;
  response: string;
}

type Handler = (msg: string, userId: string) => Promise<MatchResult>;

// ===================== Utility =====================

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { start, end };
}

function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  return { start, end };
}

function thisYearRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).toISOString();
  const end = new Date(now.getFullYear() + 1, 0, 1).toISOString();
  return { start, end };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusTh: Record<string, string> = {
  pending: "รอผู้บังคับบัญชาขั้นต้น",
  supervisor_approved: "รอผู้อนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};

// ===================== Handlers =====================

const handlers: { keywords: string[][]; handler: Handler }[] = [

  // --- จำนวนรถทั้งหมด ---
  {
    keywords: [["รถ", "กี่คัน"], ["รถ", "ทั้งหมด"], ["จำนวนรถ"], ["มีรถ", "เท่าไหร่"], ["รถ", "มี", "คัน"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data: allVehicles } = await sb.from("vehicles").select("*").order("brand");
      if (!allVehicles || allVehicles.length === 0) return { matched: true, response: "ตอนนี้ยังไม่มีรถในระบบเลยครับ ลองติดต่อ admin ให้เพิ่มข้อมูลก่อนนะ" };

      const active = allVehicles.filter(v => v.is_active);
      const inactive = allVehicles.filter(v => !v.is_active);

      const list = allVehicles.map((v, i) => {
        return `${i + 1}. ${v.brand} ${v.model} (${v.plate_number}) - ${v.vehicle_type} ${v.is_active ? "🟢 ใช้งานได้" : "🔴 ไม่ใช้งาน"}`;
      }).join("\n");

      return { matched: true, response: `🚗 ตอนนี้มีรถทั้งหมด ${allVehicles.length} คันครับ (พร้อมใช้ ${active.length} / ไม่ใช้งาน ${inactive.length}):\n${list}` };
    },
  },

  // --- รายชื่อรถ ---
  {
    keywords: [["รถ", "อะไรบ้าง"], ["รายชื่อรถ"], ["รถ", "คันไหน", "บ้าง"], ["รถ", "ทะเบียน"], ["ดูรถ"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicles").select("*").eq("is_active", true).order("brand");
      if (!data || data.length === 0) return { matched: true, response: "🚗 ตอนนี้ยังไม่มีรถในระบบเลยครับ" };
      const list = data.map((v, i) => `${i + 1}. ${v.brand} ${v.model} (${v.plate_number}) - ${v.vehicle_type}`).join("\n");
      return { matched: true, response: `🚗 รถที่พร้อมใช้งานมีดังนี้ครับ:\n${list}` };
    },
  },

  // --- รถว่าง (วันนี้ หรือ วันที่ระบุ) ---
  {
    keywords: [["รถ", "ว่าง"], ["ว่าง", "คัน"], ["ใช้รถ", "ได้"], ["สถานะ", "รถ"], ["สถานะ", "วันที่"], ["สถานะ", "วันนี้"], ["สถานะ", "พรุ่งนี้"]],
    handler: async (msg) => {
      const sb = getServiceSupabase();

      // Thai month names mapping
      const thaiMonths: Record<string, number> = {
        "มกราคม": 0, "ม.ค.": 0, "มค": 0,
        "กุมภาพันธ์": 1, "ก.พ.": 1, "กพ": 1,
        "มีนาคม": 2, "มี.ค.": 2, "มีค": 2,
        "เมษายน": 3, "เม.ย.": 3, "เมย": 3,
        "พฤษภาคม": 4, "พ.ค.": 4, "พค": 4,
        "มิถุนายน": 5, "มิ.ย.": 5, "มิย": 5,
        "กรกฎาคม": 6, "ก.ค.": 6, "กค": 6,
        "สิงหาคม": 7, "ส.ค.": 7, "สค": 7,
        "กันยายน": 8, "ก.ย.": 8, "กย": 8,
        "ตุลาคม": 9, "ต.ค.": 9, "ตค": 9,
        "พฤศจิกายน": 10, "พ.ย.": 10, "พย": 10,
        "ธันวาคม": 11, "ธ.ค.": 11, "ธค": 11,
      };

      // เช็คว่ามีวันที่ระบุไหม
      const dateMatch = msg.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      // จับวันที่แบบภาษาไทย เช่น "28 เมษายน 2569" หรือ "28 เม.ย. 2569"
      const thaiDateMatch = msg.match(/(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2,4})?/);

      let targetStart: string;
      let targetEnd: string;
      let dateLabel: string;

      if (msg.includes("พรุ่งนี้")) {
        const now = new Date();
        const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        targetStart = tmr.toISOString();
        targetEnd = new Date(tmr.getFullYear(), tmr.getMonth(), tmr.getDate() + 1).toISOString();
        dateLabel = "พรุ่งนี้";
      } else if (thaiDateMatch) {
        const day = parseInt(thaiDateMatch[1]);
        const month = thaiMonths[thaiDateMatch[2]] ?? 0;
        let year = thaiDateMatch[3] ? parseInt(thaiDateMatch[3]) : new Date().getFullYear() + 543;
        if (year > 2500) year -= 543;
        if (year < 100) year += 2000;
        targetStart = new Date(year, month, day).toISOString();
        targetEnd = new Date(year, month, day + 1).toISOString();
        dateLabel = new Date(year, month, day).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
      } else if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
        if (year > 2500) year -= 543;
        if (year < 100) year += 2000;
        targetStart = new Date(year, month, day).toISOString();
        targetEnd = new Date(year, month, day + 1).toISOString();
        dateLabel = new Date(year, month, day).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
      } else {
        const { start, end } = todayRange();
        targetStart = start;
        targetEnd = end;
        dateLabel = "วันนี้";
      }

      const { data: allVehicles } = await sb.from("vehicles").select("*").eq("is_active", true);

      // ดึงรถที่ถูกจอง: เช็คจาก departure_datetime - return_datetime ที่ซ้อนกับวันที่ถาม
      // overlap condition: departure < targetEnd AND return > targetStart
      // ถ้าออกวันที่ 25 กลับวันที่ 27 แล้วถามวันที่ 26 → ต้องนับว่าจอง
      const { data: booked } = await sb.from("vehicle_requests").select("approved_vehicle_id, departure_datetime, return_datetime, requester:requester_id(full_name), destination")
        .eq("status", "approved")
        .not("approved_vehicle_id", "is", null)
        .lt("departure_datetime", targetEnd)
        .gt("return_datetime", targetStart);

      const bookedMap = new Map<string, { name: string; dest: string; dep: string; ret: string }>();
      (booked || []).forEach(b => {
        const name = (b.requester as unknown as { full_name: string } | null)?.full_name || "ไม่ระบุ";
        bookedMap.set(b.approved_vehicle_id, { name, dest: b.destination, dep: b.departure_datetime, ret: b.return_datetime });
      });

      const bookedCount = bookedMap.size;
      const availableCount = (allVehicles || []).length - bookedCount;

      const list = (allVehicles || []).map((v, i) => {
        const booking = bookedMap.get(v.id);
        if (booking) {
          return `${i + 1}. ${v.brand} ${v.model} (${v.plate_number}) — 🔴 ถูกจอง (${booking.name} ไป${booking.dest} ${fmtDateTime(booking.dep)}-${fmtDateTime(booking.ret)})`;
        }
        return `${i + 1}. ${v.brand} ${v.model} (${v.plate_number}) — 🟢 ว่าง`;
      }).join("\n");

      return { matched: true, response: `🚗 สถานะรถ${dateLabel}นะครับ (ว่าง ${availableCount} / ถูกจอง ${bookedCount}):\n${list}` };
    },
  },

  // --- ใครขอรถวันนี้ ---
  {
    keywords: [["ใคร", "ขอ", "วันนี้"], ["วันนี้", "ใคร", "ใช้รถ"], ["วันนี้", "มีใคร"], ["คำขอ", "วันนี้"], ["รายการ", "วันนี้"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { start, end } = todayRange();
      const { data } = await sb.from("vehicle_requests")
        .select("*, requester:requester_id(full_name)")
        .lt("departure_datetime", end).gt("return_datetime", start)
        .order("departure_datetime");

      if (!data || data.length === 0) return { matched: true, response: "📋 วันนี้ไม่มีใครขอใช้รถเลยครับ ว่างๆ" };
      const list = data.map((r, i) => `${i + 1}. ${r.requester?.full_name || "ไม่ระบุ"} → ${r.destination} (${statusTh[r.status]})`).join("\n");
      return { matched: true, response: `📋 วันนี้มีคำขอ ${data.length} รายการครับ:\n${list}` };
    },
  },

  // --- คำขอเดือนนี้ ---
  {
    keywords: [["เดือนนี้", "กี่"], ["คำขอ", "เดือนนี้"], ["เดือนนี้", "ขอ"], ["สรุป", "เดือนนี้"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { start, end } = thisMonthRange();
      const { data } = await sb.from("vehicle_requests").select("status")
        .gte("request_date", start.split("T")[0]).lt("request_date", end.split("T")[0]);

      if (!data) return { matched: true, response: "ขอโทษครับ ดึงข้อมูลไม่ได้ ลองใหม่อีกทีนะ" };
      const approved = data.filter(r => r.status === "approved").length;
      const pending = data.filter(r => r.status === "pending" || r.status === "supervisor_approved").length;
      const rejected = data.filter(r => r.status === "rejected").length;
      return { matched: true, response: `📊 สรุปเดือนนี้ครับ:\n• ทั้งหมด ${data.length} รายการ\n• อนุมัติแล้ว ${approved} ✅\n• รออนุมัติ ${pending} ⏳\n• ไม่อนุมัติ ${rejected} ❌` };
    },
  },

  // --- คำขอปีนี้ ---
  {
    keywords: [["ปีนี้", "กี่"], ["คำขอ", "ปีนี้"], ["ปีนี้", "ขอ"], ["สรุป", "ปีนี้"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { start, end } = thisYearRange();
      const { data } = await sb.from("vehicle_requests").select("status")
        .gte("request_date", start.split("T")[0]).lt("request_date", end.split("T")[0]);

      if (!data) return { matched: true, response: "ขอโทษครับ ดึงข้อมูลไม่ได้ ลองใหม่อีกทีนะ" };
      const approved = data.filter(r => r.status === "approved").length;
      return { matched: true, response: `📊 สรุปปีนี้ครับ: ทั้งหมด ${data.length} รายการ (อนุมัติ ${approved} ✅) เยอะเหมือนกันนะ` };
    },
  },

  // --- คำขอเดือนที่ระบุ (เช่น เดือนเมษายน 2569) ---
  {
    keywords: [["สรุป", "เดือน"], ["รายการ", "เดือน"], ["คำขอ", "เดือน"], ["ขอใช้", "เดือน"]],
    handler: async (msg) => {
      const thaiMonthMap: Record<string, number> = {
        "มกราคม": 0, "ม.ค.": 0, "มค": 0,
        "กุมภาพันธ์": 1, "ก.พ.": 1, "กพ": 1,
        "มีนาคม": 2, "มี.ค.": 2, "มีค": 2,
        "เมษายน": 3, "เม.ย.": 3, "เมย": 3,
        "พฤษภาคม": 4, "พ.ค.": 4, "พค": 4,
        "มิถุนายน": 5, "มิ.ย.": 5, "มิย": 5,
        "กรกฎาคม": 6, "ก.ค.": 6, "กค": 6,
        "สิงหาคม": 7, "ส.ค.": 7, "สค": 7,
        "กันยายน": 8, "ก.ย.": 8, "กย": 8,
        "ตุลาคม": 9, "ต.ค.": 9, "ตค": 9,
        "พฤศจิกายน": 10, "พ.ย.": 10, "พย": 10,
        "ธันวาคม": 11, "ธ.ค.": 11, "ธค": 11,
      };

      let month = -1;
      let year = new Date().getFullYear();

      // จับชื่อเดือนภาษาไทย
      for (const [name, idx] of Object.entries(thaiMonthMap)) {
        if (msg.includes(name)) { month = idx; break; }
      }

      // จับปี
      const yearMatch = msg.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
        if (year > 2500) year -= 543;
      }

      if (month === -1) return { matched: true, response: "กรุณาระบุเดือน เช่น \"สรุปรายการเดือนเมษายน 2569\" ครับ" };

      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = new Date(year, month + 1, 1);
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
      const thaiYear = year + 543;
      const monthName = new Date(year, month, 1).toLocaleDateString("th-TH", { month: "long" });

      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests").select("status, destination, requester:requester_id(full_name)")
        .gte("request_date", start).lt("request_date", end);

      if (!data || data.length === 0) return { matched: true, response: `📊 เดือน${monthName} พ.ศ. ${thaiYear} ยังไม่มีรายการขอใช้รถเลยครับ` };
      const approved = data.filter(r => r.status === "approved").length;
      const pending = data.filter(r => r.status === "pending" || r.status === "supervisor_approved").length;
      const rejected = data.filter(r => r.status === "rejected").length;
      return { matched: true, response: `📊 สรุปเดือน${monthName} พ.ศ. ${thaiYear} ครับ:\n• ทั้งหมด ${data.length} รายการ\n• อนุมัติแล้ว ${approved} ✅\n• รออนุมัติ ${pending} ⏳\n• ไม่อนุมัติ ${rejected} ❌` };
    },
  },

  // --- คำขอปีที่ระบุ (เช่น ปี 2569, ปี 2026) ---
  {
    keywords: [["สรุป", "ปี"], ["รายการ", "ปี"], ["คำขอ", "ปี"], ["ขอใช้", "ปี"]],
    handler: async (msg) => {
      const yearMatch = msg.match(/ปี\s*(?:พ\.?ศ\.?\s*)?(\d{4})/i) || msg.match(/(\d{4})/);
      if (!yearMatch) return { matched: true, response: "กรุณาระบุปี เช่น \"สรุปรายการปี 2569\" ครับ" };

      let year = parseInt(yearMatch[1]);
      if (year > 2500) year -= 543;
      if (year < 100) year += 2000;

      const start = `${year}-01-01`;
      const end = `${year + 1}-01-01`;
      const thaiYear = year + 543;

      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests").select("status")
        .gte("request_date", start).lt("request_date", end);

      if (!data || data.length === 0) return { matched: true, response: `📊 ปี พ.ศ. ${thaiYear} ยังไม่มีรายการขอใช้รถเลยครับ` };
      const approved = data.filter(r => r.status === "approved").length;
      const pending = data.filter(r => r.status === "pending" || r.status === "supervisor_approved").length;
      const rejected = data.filter(r => r.status === "rejected").length;
      return { matched: true, response: `📊 สรุปปี พ.ศ. ${thaiYear} ครับ:\n• ทั้งหมด ${data.length} รายการ\n• อนุมัติแล้ว ${approved} ✅\n• รออนุมัติ ${pending} ⏳\n• ไม่อนุมัติ ${rejected} ❌` };
    },
  },

  // --- รถคันไหนใช้บ่อย ---
  {
    keywords: [["รถ", "ใช้บ่อย"], ["รถ", "นิยม"], ["รถ", "ยอดนิยม"], ["คันไหน", "บ่อย"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests")
        .select("approved_vehicle:approved_vehicle_id(plate_number, brand, model)")
        .eq("status", "approved").not("approved_vehicle_id", "is", null);

      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีข้อมูลการใช้รถ" };

      const counts: Record<string, { label: string; count: number }> = {};
      data.forEach(r => {
        const v = r.approved_vehicle as unknown as { plate_number: string; brand: string; model: string } | null;
        if (!v) return;
        const key = v.plate_number;
        if (!counts[key]) counts[key] = { label: `${v.brand} ${v.model} (${v.plate_number})`, count: 0 };
        counts[key].count++;
      });

      const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
      const list = sorted.map((v, i) => `${i + 1}. ${v.label} — ${v.count} ครั้ง`).join("\n");
      return { matched: true, response: `🏆 รถที่ใช้บ่อย:\n${list}` };
    },
  },

  // --- สถานที่ไปบ่อย ---
  {
    keywords: [["สถานที่", "บ่อย"], ["ไปไหน", "บ่อย"], ["เดินทาง", "บ่อย"], ["ที่ไหน", "บ่อย"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests").select("destination").eq("status", "approved");
      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีข้อมูล" };

      const counts: Record<string, number> = {};
      data.forEach(r => { counts[r.destination] = (counts[r.destination] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const list = sorted.map(([dest, count], i) => `${i + 1}. ${dest} — ${count} ครั้ง`).join("\n");
      return { matched: true, response: `📍 สถานที่เดินทางบ่อย:\n${list}` };
    },
  },

  // --- คำขอของฉัน ---
  {
    keywords: [["คำขอ", "ของฉัน"], ["ของฉัน"], ["คำขอ", "ของผม"], ["ของผม"], ["รายการ", "ฉัน"], ["สถานะ", "ฉัน"], ["สถานะ", "ผม"]],
    handler: async (_msg, userId) => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests")
        .select("*").eq("requester_id", userId).order("created_at", { ascending: false }).limit(5);

      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีคำขอของคุณในระบบเลยครับ ลองกดขอใช้รถดูนะ 😊" };
      const list = data.map((r, i) => `${i + 1}. ${fmtDate(r.request_date)} → ${r.destination} (${statusTh[r.status]})`).join("\n");
      return { matched: true, response: `📋 คำขอล่าสุดของคุณครับ:\n${list}` };
    },
  },

  // --- คำขอรออนุมัติ ---
  {
    keywords: [["รอ", "อนุมัติ"], ["pending"], ["ค้างอนุมัติ"], ["ยังไม่อนุมัติ"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests")
        .select("*, requester:requester_id(full_name)")
        .in("status", ["pending", "supervisor_approved"])
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) return { matched: true, response: "✅ ตอนนี้ไม่มีคำขอค้างรออนุมัติเลยครับ เคลียร์หมดแล้ว 👍" };
      const list = data.map((r, i) => `${i + 1}. ${r.requester?.full_name || "-"} → ${r.destination} (${statusTh[r.status]})`).join("\n");
      return { matched: true, response: `⏳ มีคำขอรออนุมัติ ${data.length} รายการครับ:\n${list}` };
    },
  },

  // --- จำนวนผู้ใช้ ---
  {
    keywords: [["ผู้ใช้", "กี่คน"], ["user", "กี่คน"], ["จำนวน", "ผู้ใช้"], ["มีใคร", "บ้าง", "ระบบ"], ["คน", "ในระบบ"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("users").select("role").eq("is_approved", true);
      if (!data) return { matched: true, response: "ไม่สามารถดึงข้อมูลได้" };

      const byRole: Record<string, number> = {};
      data.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });

      const roleTh: Record<string, string> = { user: "ผู้ใช้ทั่วไป", supervisor: "ผู้บังคับบัญชาขั้นต้น", approver: "ผู้อนุมัติ", admin: "ผู้ดูแลระบบ" };
      const list = Object.entries(byRole).map(([role, count]) => `• ${roleTh[role] || role}: ${count} คน`).join("\n");
      return { matched: true, response: `👥 ผู้ใช้ในระบบ ${data.length} คน:\n${list}` };
    },
  },

  // --- พรุ่งนี้มีใครขอ ---
  {
    keywords: [["พรุ่งนี้", "ใคร"], ["พรุ่งนี้", "ขอ"], ["พรุ่งนี้", "รถ"], ["คำขอ", "พรุ่งนี้"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();
      const { data } = await sb.from("vehicle_requests")
        .select("*, requester:requester_id(full_name)")
        .lt("departure_datetime", end).gt("return_datetime", start)
        .order("departure_datetime");

      if (!data || data.length === 0) return { matched: true, response: "📋 พรุ่งนี้ไม่มีคำขอใช้รถ" };
      const list = data.map((r, i) => `${i + 1}. ${r.requester?.full_name || "-"} → ${r.destination} (${statusTh[r.status]})`).join("\n");
      return { matched: true, response: `📋 คำขอพรุ่งนี้ ${data.length} รายการ:\n${list}` };
    },
  },

  // --- สัปดาห์นี้ ---
  {
    keywords: [["สัปดาห์นี้"], ["อาทิตย์นี้"], ["สัปดาห์", "ขอ"], ["week"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);

      const { data } = await sb.from("vehicle_requests")
        .select("*, requester:requester_id(full_name)")
        .lt("departure_datetime", sunday.toISOString()).gt("return_datetime", monday.toISOString())
        .order("departure_datetime");

      if (!data || data.length === 0) return { matched: true, response: "📋 สัปดาห์นี้ไม่มีคำขอใช้รถ" };
      const list = data.map((r, i) => `${i + 1}. ${fmtDateTime(r.departure_datetime)} ${r.requester?.full_name || "-"} → ${r.destination}`).join("\n");
      return { matched: true, response: `📋 คำขอสัปดาห์นี้ ${data.length} รายการ:\n${list}` };
    },
  },

  // --- กลุ่มงานไหนขอบ่อย ---
  {
    keywords: [["กลุ่มงาน", "บ่อย"], ["กลุ่มงาน", "ขอ", "มากสุด"], ["หน่วยงาน", "บ่อย"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests")
        .select("requester:requester_id(department)");

      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีข้อมูล" };
      const counts: Record<string, number> = {};
      data.forEach(r => {
        const dept = (r.requester as { department?: string } | null)?.department || "ไม่ระบุ";
        counts[dept] = (counts[dept] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const list = sorted.map(([dept, count], i) => `${i + 1}. ${dept} — ${count} ครั้ง`).join("\n");
      return { matched: true, response: `🏢 สรุปตามกลุ่มงาน:\n${list}` };
    },
  },

  // --- ช่วยอะไรได้บ้าง ---
  {
    keywords: [["ช่วย", "อะไร"], ["ทำอะไร", "ได้"], ["ถาม", "อะไร", "ได้"], ["คำสั่ง"], ["help"], ["เมนู"], ["ใช้ยังไง"], ["วิธีใช้"]],
    handler: async () => {
      return {
        matched: true,
        response: `🤖 ถามได้เลยครับ เช่น:\n\n📋 ข้อมูลรถ:\n• "รถมีกี่คัน" — ดูรถทั้งหมดพร้อมสถานะ\n• "รถอะไรบ้าง" — รายชื่อรถที่ใช้งานได้\n• "รถว่างวันนี้" — สถานะรถวันนี้\n• "รถว่างวันที่ 15/1" — สถานะรถวันที่ระบุ\n• "รถว่าง 28 เมษายน 2569" — ระบุวันที่ภาษาไทยได้\n\n📅 คำขอใช้รถ:\n• "วันนี้ใครขอรถ"\n• "พรุ่งนี้มีใครขอ"\n• "สัปดาห์นี้มีคำขอกี่รายการ"\n• "คำขอของฉัน" — ดูคำขอล่าสุดของตัวเอง\n• "คำขอรออนุมัติ"\n\n📊 สรุปสถิติ:\n• "สรุปเดือนนี้" / "สรุปเดือนเมษายน 2569"\n• "สรุปปีนี้" / "สรุปปี 2569"\n• "ใครขอใช้มากที่สุด"\n• "รถคันไหนใช้บ่อย"\n• "สถานที่ไปบ่อย"\n• "กลุ่มงานไหนขอบ่อย"\n\n👥 ข้อมูลอื่นๆ:\n• "ผู้ใช้มีกี่คน"\n• "ใครเป็นผู้อนุมัติ"\n• "ใครเป็นผู้บังคับบัญชา"\n• "ขอใช้รถยังไง" — วิธีขอใช้รถ\n• "วันนี้วันอะไร"`,
      };
    },
  },

  // --- ใครขอใช้มากที่สุด ---
  {
    keywords: [["ใคร", "ขอ", "มากที่สุด"], ["ใคร", "ขอ", "บ่อย"], ["ใคร", "ใช้", "มากสุด"], ["คน", "ขอ", "บ่อย"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("vehicle_requests")
        .select("requester:requester_id(full_name)");

      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีข้อมูลการขอใช้รถเลยครับ" };

      const counts: Record<string, number> = {};
      data.forEach(r => {
        const name = (r.requester as unknown as { full_name: string } | null)?.full_name || "ไม่ระบุ";
        counts[name] = (counts[name] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const list = sorted.map(([name, count], i) => `${i + 1}. ${name} — ${count} ครั้ง`).join("\n");
      return { matched: true, response: `🏆 คนที่ขอใช้รถบ่อยสุดครับ:\n${list}` };
    },
  },

  // --- วันนี้วันอะไร ---
  {
    keywords: [["วันนี้", "วันอะไร"], ["วันนี้", "วันที่"], ["วันที่เท่าไหร่"], ["วันนี้", "ที่เท่าไหร่"]],
    handler: async () => {
      const now = new Date();
      const thai = now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      return { matched: true, response: `📅 วันนี้คือ ${thai} (พ.ศ. ${now.getFullYear() + 543})` };
    },
  },

  // --- ขอใช้รถยังไง ---
  {
    keywords: [["ขอ", "ยังไง"], ["ขอ", "อย่างไร"], ["วิธี", "ขอ"], ["ขั้นตอน", "ขอ"], ["ขอรถ", "ยังไง"]],
    handler: async () => {
      return { matched: true, response: `📝 วิธีขอใช้รถ:\n1. กดเมนู "ขอใช้รถ"\n2. กรอกวันเวลาออก-กลับ สถานที่ วัตถุประสงค์\n3. ลงลายเซ็น แล้วกดส่งคำขอ\n4. รอผู้บังคับบัญชาขั้นต้นอนุมัติ\n5. รอผู้อนุมัติอนุมัติขั้นสุดท้าย\n6. อนุมัติแล้วสามารถพิมพ์เอกสาร A4 ได้` };
    },
  },

  // --- ใครเป็นผู้อนุมัติ ---
  {
    keywords: [["ใคร", "อนุมัติ"], ["ผู้อนุมัติ", "ใคร"], ["ใคร", "approve"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("users").select("full_name, position").eq("role", "approver").eq("is_approved", true);
      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีผู้อนุมัติในระบบ" };
      const list = data.map((u, i) => `${i + 1}. ${u.full_name} (${u.position})`).join("\n");
      return { matched: true, response: `👤 ผู้อนุมัติในระบบ:\n${list}` };
    },
  },

  // --- ใครเป็นผู้บังคับบัญชา ---
  {
    keywords: [["ผู้บังคับบัญชา", "ใคร"], ["supervisor", "ใคร"], ["หัวหน้า", "ใคร"]],
    handler: async () => {
      const sb = getServiceSupabase();
      const { data } = await sb.from("users").select("full_name, position").eq("role", "supervisor").eq("is_approved", true);
      if (!data || data.length === 0) return { matched: true, response: "ยังไม่มีผู้บังคับบัญชาขั้นต้นในระบบ" };
      const list = data.map((u, i) => `${i + 1}. ${u.full_name} (${u.position})`).join("\n");
      return { matched: true, response: `👤 ผู้บังคับบัญชาขั้นต้นในระบบ:\n${list}` };
    },
  },

  // --- ทักทาย ---
  {
    keywords: [["สวัสดี"], ["หวัดดี"], ["ดีครับ"], ["ดีค่ะ"], ["hello"], ["hi"]],
    handler: async () => {
      return { matched: true, response: "สวัสดีครับ 🙏 ยินดีต้อนรับเข้าสู่ระบบขอใช้รถยนต์ราชการครับ ผมช่วยอะไรได้บ้าง? ลองพิมพ์ \"ช่วยอะไรได้บ้าง\" เพื่อดูตัวอย่างคำถามนะครับ" };
    },
  },

  // --- ขอบคุณ ---
  {
    keywords: [["ขอบคุณ"], ["ขอบใจ"], ["thanks"], ["thank"]],
    handler: async () => {
      return { matched: true, response: "ยินดีเสมอครับ 🙏😊 ถ้ามีอะไรถามเพิ่มได้ตลอดนะ" };
    },
  },
];

// ===================== Matcher =====================

function matchKeywords(msg: string, keywordSets: string[][]): boolean {
  const lower = msg.toLowerCase();
  return keywordSets.some(keywords => keywords.every(kw => lower.includes(kw.toLowerCase())));
}

// ===================== LLM Fallback =====================

async function gatherDbContext() {
  const sb = getServiceSupabase();
  const { start, end } = todayRange();

  const [vehiclesRes, requestsTodayRes, pendingRes, statsRes] = await Promise.all([
    sb.from("vehicles").select("plate_number, brand, model, vehicle_type, is_active"),
    sb.from("vehicle_requests")
      .select("destination, purpose, status, departure_datetime, return_datetime, requester:requester_id(full_name), approved_vehicle:approved_vehicle_id(plate_number)")
      .lt("departure_datetime", end).gte("return_datetime", start),
    sb.from("vehicle_requests").select("status, destination, requester:requester_id(full_name)")
      .in("status", ["pending", "supervisor_approved"]),
    sb.from("vehicle_requests").select("status"),
  ]);

  const vehicles = vehiclesRes.data || [];
  const todayRequests = requestsTodayRes.data || [];
  const pendingRequests = pendingRes.data || [];
  const allRequests = statsRes.data || [];

  return `
ข้อมูลระบบขอใช้รถยนต์ราชการ สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี (ข้อมูล ณ ตอนนี้):

รถยนต์ทั้งหมด ${vehicles.length} คัน:
${vehicles.map(v => `- ${v.brand} ${v.model} (${v.plate_number}) ${v.vehicle_type} [${v.is_active ? "ใช้งานได้" : "ไม่ใช้งาน"}]`).join("\n")}

คำขอใช้รถวันนี้ ${todayRequests.length} รายการ:
${todayRequests.map(r => `- ${(r.requester as unknown as { full_name: string } | null)?.full_name || "ไม่ระบุ"} ไป${r.destination} (${statusTh[r.status]}) รถ: ${(r.approved_vehicle as unknown as { plate_number: string } | null)?.plate_number || "ยังไม่กำหนด"}`).join("\n") || "ไม่มี"}

คำขอรออนุมัติ ${pendingRequests.length} รายการ:
${pendingRequests.map(r => `- ${(r.requester as unknown as { full_name: string } | null)?.full_name || "ไม่ระบุ"} ไป${r.destination} (${statusTh[r.status]})`).join("\n") || "ไม่มี"}

สถิติรวม: ทั้งหมด ${allRequests.length} รายการ, อนุมัติ ${allRequests.filter(r => r.status === "approved").length}, รออนุมัติ ${allRequests.filter(r => r.status === "pending" || r.status === "supervisor_approved").length}, ไม่อนุมัติ ${allRequests.filter(r => r.status === "rejected").length}
`.trim();
}

async function askLLM(userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "🤔 อืม... ผมไม่ค่อยเข้าใจคำถามนี้ครับ ลองพิมพ์ \"ช่วยอะไรได้บ้าง\" เพื่อดูตัวอย่างคำถามที่ถามได้นะครับ 😊";
  }

  try {
    const groq = createGroq({ apiKey });
    const dbContext = await gatherDbContext();
    const now = new Date();
    const thaiDate = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: `คุณชื่อ "ผู้ช่วย AI-UBISD" เป็นแชทบอทของระบบขอใช้รถยนต์ราชการอัจฉริยะ สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี

กฎสำคัญ:
- ตอบเป็นภาษาไทยเท่านั้น สั้น กระชับ เป็นกันเอง ใช้ emoji ให้เหมาะสม
- วันนี้คือ ${thaiDate} (พ.ศ. ${now.getFullYear() + 543})
- ใช้ปี พ.ศ. เสมอ (เช่น 2569 ไม่ใช่ 2026)
- ตอบเฉพาะเรื่องระบบขอใช้รถ ถ้าถามเรื่องอื่นให้บอกสั้นๆ ว่า "ผมตอบได้เฉพาะเรื่องระบบขอใช้รถครับ"
- ถ้าไม่แน่ใจคำตอบ ให้แนะนำว่า "ลองพิมพ์ 'ช่วยอะไรได้บ้าง' เพื่อดูตัวอย่างคำถามครับ"
- อย่าแต่งข้อมูลเอง ใช้เฉพาะข้อมูลที่ให้ด้านล่าง

ข้อมูลระบบ ณ ตอนนี้:
${dbContext}`,
      prompt: userMessage,
      maxOutputTokens: 500,
    });

    return text || "ขอโทษครับ ไม่สามารถตอบได้ในขณะนี้";
  } catch (error) {
    console.error("LLM error:", error);
    return "🤔 อืม... ผมไม่ค่อยเข้าใจคำถามนี้ครับ ลองพิมพ์ \"ช่วยอะไรได้บ้าง\" ดูนะ 😊";
  }
}

// ===================== POST Handler =====================

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
  }

  const msg = message.trim();

  // 1. ลอง rule-based ก่อน (เร็ว ฟรี)
  for (const { keywords, handler } of handlers) {
    if (matchKeywords(msg, keywords)) {
      const result = await handler(msg, user.id);
      if (result.matched) {
        return NextResponse.json({ response: result.response });
      }
    }
  }

  // 2. ถ้ามีวันที่ในข้อความ ให้เข้า handler สถานะรถอัตโนมัติ
  const hasDate = /\d{1,2}[\/\-]\d{1,2}/.test(msg) || /\d{1,2}\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/.test(msg);
  if (hasDate) {
    const vehicleHandler = handlers.find(h => h.keywords.some(kw => kw.includes("รถ") && kw.includes("ว่าง")));
    if (vehicleHandler) {
      const result = await vehicleHandler.handler(msg, user.id);
      if (result.matched) {
        return NextResponse.json({ response: result.response });
      }
    }
  }

  // 3. Fallback ไป LLM (Groq)
  const llmResponse = await askLLM(msg);
  return NextResponse.json({ response: llmResponse });
}
