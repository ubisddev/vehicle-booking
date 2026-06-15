"use client";

import { VehicleRequest } from "@/types";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
}

export default function PrintDocument({ request }: { request: VehicleRequest }) {
  return (
    <div className="print-doc w-[210mm] min-h-[297mm] mx-auto bg-white text-black p-[12mm] text-[11px] leading-relaxed" id="print-area">
      {/* หัวเอกสาร */}
      <div className="text-center mb-3">
        <p className="text-[14px] font-bold">แบบฟอร์มขอใช้รถยนต์ราชการ</p>
        <p className="text-[12px]">สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี</p>
      </div>

      <p className="text-right mb-2">วันที่ขอ: {fmtDate(request.request_date)}</p>

      {/* ข้อมูลการเดินทาง */}
      <table className="w-full border border-black border-collapse mb-2">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 w-[35%] font-semibold bg-gray-50">วันเวลาออกเดินทาง</td>
            <td className="border border-black px-2 py-1">{fmtDateTime(request.departure_datetime)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold bg-gray-50">วันเวลากลับถึงหน่วยงาน</td>
            <td className="border border-black px-2 py-1">{fmtDateTime(request.return_datetime)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold bg-gray-50">สถานที่เดินทางไป</td>
            <td className="border border-black px-2 py-1">{request.destination}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold bg-gray-50">เพื่อไป</td>
            <td className="border border-black px-2 py-1">{request.purpose}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold bg-gray-50">ผู้ร่วมเดินทาง</td>
            <td className="border border-black px-2 py-1 whitespace-pre-line">{request.passengers || "-"}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold bg-gray-50">รถที่อนุมัติ</td>
            <td className="border border-black px-2 py-1">
              {request.approved_vehicle
                ? `${request.approved_vehicle.brand} ${request.approved_vehicle.model} (${request.approved_vehicle.plate_number})`
                : "-"}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 font-semibold bg-gray-50">ผู้ขับที่อนุมัติ</td>
            <td className="border border-black px-2 py-1">{request.approved_driver_name || "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* ส่วนลงนาม 3 คอลัมน์ */}
      <table className="w-full border border-black border-collapse mb-2">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 bg-gray-50 w-1/3">ผู้ขอใช้รถ</th>
            <th className="border border-black px-2 py-1 bg-gray-50 w-1/3">ผู้บังคับบัญชาขั้นต้น</th>
            <th className="border border-black px-2 py-1 bg-gray-50 w-1/3">ผู้อนุมัติ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {/* ผู้ขอ */}
            <td className="border border-black px-2 py-1 text-center align-top h-[80px]">
              {request.requester_signature ? (
                <img src={request.requester_signature} alt="ลายเซ็น" className="h-[50px] mx-auto" />
              ) : (
                <div className="h-[50px]" />
              )}
              <p className="mt-1">({request.requester?.full_name || ""})</p>
              <p className="text-[10px] text-gray-600">{request.requester?.position || ""}</p>
            </td>
            {/* ผู้บังคับบัญชา */}
            <td className="border border-black px-2 py-1 text-center align-top h-[80px]">
              {request.supervisor_signature ? (
                <img src={request.supervisor_signature} alt="ลายเซ็น" className="h-[50px] mx-auto" />
              ) : (
                <div className="h-[50px]" />
              )}
              <p className="mt-1">({request.supervisor?.full_name || ""})</p>
              <p className="text-[10px] text-gray-600">{request.supervisor?.position || ""}</p>
            </td>
            {/* ผู้อนุมัติ */}
            <td className="border border-black px-2 py-1 text-center align-top h-[80px]">
              {request.approver_signature ? (
                <img src={request.approver_signature} alt="ลายเซ็น" className="h-[50px] mx-auto" />
              ) : (
                <div className="h-[50px]" />
              )}
              <p className="mt-1">({request.approver?.full_name || ""})</p>
              <p className="text-[10px] text-gray-600">{request.approver?.position || ""}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* บันทึกการเดินทาง */}
      <p className="font-bold text-[12px] mb-1">บันทึกการเดินทาง</p>
      <table className="w-full border border-black border-collapse mb-2">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-2 w-[35%] font-semibold bg-gray-50">เวลาออกเดินทางจริง</td>
            <td className="border border-black px-2 py-2">..........................................................</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 font-semibold bg-gray-50">เวลากลับถึงหน่วยงาน</td>
            <td className="border border-black px-2 py-2">..........................................................</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 font-semibold bg-gray-50">เลขกิโลเมตรก่อนเดินทาง</td>
            <td className="border border-black px-2 py-2">..........................................................</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 font-semibold bg-gray-50">เลขกิโลเมตรหลังเดินทาง</td>
            <td className="border border-black px-2 py-2">..........................................................</td>
          </tr>
        </tbody>
      </table>

      {/* ลงนามผู้ขับ + รปภ. */}
      <table className="w-full border border-black border-collapse mb-4">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 bg-gray-50 w-1/2">ผู้ขับรถ</th>
            <th className="border border-black px-2 py-1 bg-gray-50 w-1/2">พนักงานรักษาความปลอดภัย</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 text-center h-[70px] align-bottom">
              <p>ลงชื่อ ........................................</p>
              <p className="mt-1">( ......................................... )</p>
            </td>
            <td className="border border-black px-2 py-1 text-center h-[70px] align-bottom">
              <p>ลงชื่อ ........................................</p>
              <p className="mt-1">( ......................................... )</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== การขออนุมัติเบิกจ่ายน้ำมัน ===== */}
      <div className="border border-black p-3">
        <p className="text-center font-bold text-[12px] mb-2">การขออนุมัติเบิกจ่ายน้ำมัน</p>

        {/* แถว 1: ประเภทน้ำมัน + จำนวน + เป็นเงิน */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 text-[11px]">
          <label className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 border border-black shrink-0" />
            ดีเซล
          </label>
          <label className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 border border-black shrink-0" />
            เบนซิน
          </label>
          <label className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 border border-black shrink-0" />
            แก๊สโซฮอล์
          </label>
          <span>............</span>
          <span className="ml-2">จำนวน</span>
          <span className="border-b border-black inline-block w-[80px]" />
          <span>ลิตร</span>
          <span className="ml-2">เป็นเงิน</span>
          <span className="border-b border-black inline-block w-[100px]" />
          <span>บาท</span>
        </div>

        {/* แถว 2: มอบหมายให้ */}
        <div className="flex flex-wrap items-center gap-x-1 mb-3 text-[11px]">
          <span>และขอมอบหมายให้</span>
          <span className="border-b border-black inline-block w-[120px]" />
          <span>ตำแหน่ง</span>
          <span className="border-b border-black inline-block w-[120px]" />
          <span>เป็นผู้จัดซื้อและตรวจรับน้ำมันในครั้งนี้</span>
        </div>

        {/* แถว 3: เกจวัดน้ำมัน + ลงชื่อ 2 คอลัมน์ */}
        <div className="flex items-start gap-4">
          {/* เกจวัดน้ำมัน */}
          <div className="shrink-0 flex flex-col items-center justify-center w-[90px]">
            <svg viewBox="0 0 90 60" className="w-[90px] h-[60px]">
              {/* ครึ่งวงกลม */}
              <path d="M 10 50 A 35 35 0 0 1 80 50" fill="none" stroke="black" strokeWidth="2" />
              {/* เส้นขีด F */}
              <line x1="78" y1="50" x2="85" y2="50" stroke="black" strokeWidth="1.5" />
              {/* เส้นขีด E */}
              <line x1="12" y1="50" x2="5" y2="50" stroke="black" strokeWidth="1.5" />
              {/* เส้นกลาง (ครึ่งถัง) */}
              <line x1="45" y1="15" x2="45" y2="8" stroke="black" strokeWidth="1.5" />
              {/* เข็ม */}
              <line x1="45" y1="50" x2="45" y2="20" stroke="black" strokeWidth="1.5" />
              {/* จุดกลาง */}
              <circle cx="45" cy="50" r="3" fill="black" />
              {/* ป้าย F */}
              <text x="82" y="48" fontSize="7" fontWeight="bold" textAnchor="start">F</text>
              <text x="82" y="56" fontSize="6" textAnchor="start">เต็มถัง</text>
              {/* ป้าย E */}
              <text x="1" y="48" fontSize="7" fontWeight="bold" textAnchor="start">E</text>
              <text x="0" y="56" fontSize="6" textAnchor="start">หมดถัง</text>
              {/* ป้าย ครึ่งถัง */}
              <text x="38" y="7" fontSize="5" textAnchor="middle">ครึ่งถัง</text>
            </svg>
          </div>

          {/* ลงชื่อ 2 คอลัมน์ */}
          <div className="flex-1 grid grid-cols-2 gap-4 text-[11px]">
            {/* ผู้ขออนุมัติ */}
            <div>
              <div className="flex items-end gap-1 mb-1">
                <span>ชื่อ</span>
                <span className="border-b border-black flex-1 inline-block" />
                <span>ผู้ขออนุมัติ</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span>(</span>
                <span className="border-b border-black flex-1 inline-block" />
                <span>)</span>
              </div>
              <div className="flex items-end gap-1">
                <span>ตำแหน่ง</span>
                <span className="border-b border-black flex-1 inline-block" />
              </div>
            </div>
            {/* ผู้อนุมัติ */}
            <div>
              <div className="flex items-end gap-1 mb-1">
                <span>ลงชื่อ</span>
                <span className="border-b border-black flex-1 inline-block" />
                <span>ผู้อนุมัติ</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span>(</span>
                <span className="border-b border-black flex-1 inline-block" />
                <span>)</span>
              </div>
              <div className="flex items-end gap-1">
                <span>ตำแหน่ง</span>
                <span className="border-b border-black flex-1 inline-block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
