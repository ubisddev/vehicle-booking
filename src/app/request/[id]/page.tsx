"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import SignaturePad from "@/components/SignaturePad";
import { User, VehicleRequest, Vehicle } from "@/types";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("th-TH", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [request, setRequest] = useState<VehicleRequest | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      setUser(await meRes.json());

      const reqRes = await fetch(`/api/requests/${id}`);
      if (reqRes.ok) setRequest(await reqRes.json());

      const vehRes = await fetch("/api/vehicles");
      if (vehRes.ok) setVehicles((await vehRes.json()).filter((v: Vehicle) => v.is_active));

      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleAction = async (action: string) => {
    if ((action === "supervisor_approve" || action === "approve") && !signature) {
      alert("กรุณาลงลายเซ็นก่อนอนุมัติ");
      return;
    }
    setActionLoading(true);
    const res = await fetch(`/api/requests/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action, comment, signature,
        vehicle_id: vehicleId || undefined,
        driver_name: driverName || undefined,
      }),
    });

    if (res.ok) {
      const reqRes = await fetch(`/api/requests/${id}`);
      if (reqRes.ok) setRequest(await reqRes.json());
      setComment("");
      setSignature("");
    } else {
      const data = await res.json();
      alert(data.error || "เกิดข้อผิดพลาด");
    }
    setActionLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">กำลังโหลด...</p></div>;
  }
  if (!request) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">ไม่พบคำขอ</p></div>;
  }

  const canSupervisorApprove = user && (user.role === "supervisor" || user.role === "admin") && request.status === "pending";
  const canApprove = user && (user.role === "approver" || user.role === "admin") && request.status === "supervisor_approved";
  const canReject = user && (user.role === "supervisor" || user.role === "approver" || user.role === "admin")
    && (request.status === "pending" || request.status === "supervisor_approved");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">รายละเอียดคำขอใช้รถ</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={request.status} />
            {request.status === "approved" && (
              <Link href={`/request/${id}/print`}
                className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm transition">
                🖨️ พิมพ์
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <InfoRow label="วันที่ขอ" value={new Date(request.request_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} />
          <InfoRow label="ผู้ขอ" value={`${request.requester?.full_name || "-"} (${request.requester?.position || ""})`} />
          <InfoRow label="กลุ่มงาน" value={request.requester?.department || "-"} />
          <InfoRow label="วันเวลาออกเดินทาง" value={formatDateTime(request.departure_datetime)} />
          <InfoRow label="วันเวลากลับถึง" value={formatDateTime(request.return_datetime)} />
          <InfoRow label="สถานที่เดินทางไป" value={request.destination} />
          <InfoRow label="เพื่อไป" value={request.purpose} />
          <InfoRow label="ผู้ร่วมเดินทาง" value={request.passengers || "-"} />

          {/* ลายเซ็นผู้ขอ */}
          {request.requester_signature && (
            <div className="flex">
              <span className="w-48 text-gray-500 text-sm shrink-0">ลายเซ็นผู้ขอ</span>
              <img src={request.requester_signature} alt="ลายเซ็นผู้ขอ" className="h-16 border rounded" />
            </div>
          )}

          {request.supervisor && (
            <>
              <hr />
              <InfoRow label="ผู้บังคับบัญชาขั้นต้น" value={request.supervisor.full_name} />
              {request.supervisor_approved_at && <InfoRow label="อนุมัติเมื่อ" value={formatDateTime(request.supervisor_approved_at)} />}
              {request.supervisor_comment && <InfoRow label="ความเห็น" value={request.supervisor_comment} />}
              {request.supervisor_signature && (
                <div className="flex">
                  <span className="w-48 text-gray-500 text-sm shrink-0">ลายเซ็น</span>
                  <img src={request.supervisor_signature} alt="ลายเซ็นผู้บังคับบัญชา" className="h-16 border rounded" />
                </div>
              )}
            </>
          )}

          {request.approver && (
            <>
              <hr />
              <InfoRow label="ผู้อนุมัติ" value={request.approver.full_name} />
              {request.approved_at && <InfoRow label="อนุมัติเมื่อ" value={formatDateTime(request.approved_at)} />}
              {request.approver_comment && <InfoRow label="ความเห็น" value={request.approver_comment} />}
              {request.approver_signature && (
                <div className="flex">
                  <span className="w-48 text-gray-500 text-sm shrink-0">ลายเซ็น</span>
                  <img src={request.approver_signature} alt="ลายเซ็นผู้อนุมัติ" className="h-16 border rounded" />
                </div>
              )}
            </>
          )}

          {request.approved_vehicle && (
            <>
              <hr />
              <InfoRow label="รถที่อนุมัติ" value={`${request.approved_vehicle.brand} ${request.approved_vehicle.model} (${request.approved_vehicle.plate_number})`} />
            </>
          )}
          {request.approved_driver_name && <InfoRow label="ผู้ขับที่อนุมัติ" value={request.approved_driver_name} />}
        </div>

        {/* ส่วนอนุมัติ */}
        {(canSupervisorApprove || canApprove || canReject) && (
          <div className="bg-white rounded-xl shadow p-6 mt-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">ดำเนินการ</h2>

            {canApprove && (
              <>
                <div>
                  <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 mb-1">เลือกรถ</label>
                  <select id="vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none">
                    <option value="">-- เลือกรถ --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="driver" className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ขับ</label>
                  <input id="driver" type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none" placeholder="ชื่อผู้ขับรถ" />
                </div>
              </>
            )}

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">ความเห็น (ถ้ามี)</label>
              <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none" rows={2} />
            </div>

            {(canSupervisorApprove || canApprove) && (
              <SignaturePad
                label="ลงลายเซ็น"
                onSave={(sig) => setSignature(sig)}
              />
            )}

            <div className="flex gap-3">
              {canSupervisorApprove && (
                <button onClick={() => handleAction("supervisor_approve")} disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition disabled:opacity-50">
                  อนุมัติ (ผู้บังคับบัญชาขั้นต้น)
                </button>
              )}
              {canApprove && (
                <button onClick={() => handleAction("approve")} disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition disabled:opacity-50">
                  อนุมัติ
                </button>
              )}
              {canReject && (
                <button onClick={() => handleAction("reject")} disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition disabled:opacity-50">
                  ไม่อนุมัติ
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← กลับไปแดชบอร์ด</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-48 text-gray-500 text-sm shrink-0">{label}</span>
      <span className="text-gray-800 text-sm">{value}</span>
    </div>
  );
}
