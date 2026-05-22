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
      <table className="w-full border border-black border-collapse">
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
    </div>
  );
}
