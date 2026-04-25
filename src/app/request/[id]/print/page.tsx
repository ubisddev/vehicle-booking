"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PrintDocument from "@/components/PrintDocument";
import { VehicleRequest } from "@/types";

export default function PrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [request, setRequest] = useState<VehicleRequest | null>(null);

  useEffect(() => {
    fetch(`/api/requests/${id}`).then(r => r.json()).then(setRequest);
  }, [id]);

  const handlePrint = () => window.print();

  if (!request) {
    return <div className="min-h-screen flex items-center justify-center"><p>กำลังโหลด...</p></div>;
  }

  return (
    <div>
      <div className="print:hidden bg-gray-100 p-4 text-center sticky top-0 z-10 flex items-center justify-center gap-3">
        <button onClick={() => window.history.back()}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition">
          ← ย้อนกลับ
        </button>
        <button onClick={handlePrint}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg transition">
          🖨️ พิมพ์เอกสาร A4
        </button>
      </div>
      <PrintDocument request={request} />
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
          }
          .print\\:hidden { display: none !important; }
          .print-doc {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
