"use client";

import { RequestStatus } from "@/types";

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: "รอผู้บังคับบัญชาขั้นต้น", className: "bg-yellow-100 text-yellow-800" },
  supervisor_approved: { label: "รอผู้อนุมัติ", className: "bg-blue-100 text-blue-800" },
  approved: { label: "อนุมัติแล้ว", className: "bg-green-100 text-green-800" },
  rejected: { label: "ไม่อนุมัติ", className: "bg-red-100 text-red-800" },
};

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
