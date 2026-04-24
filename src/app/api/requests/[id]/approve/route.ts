import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { sendEmail, buildRequestEmailHtml } from "@/lib/email";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { action, comment, vehicle_id, driver_name, signature } = body;
  // action: "supervisor_approve" | "approve" | "reject"

  const supabase = getServiceSupabase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ดึงข้อมูลคำขอ
  const { data: req, error: reqErr } = await supabase
    .from("vehicle_requests")
    .select(`*, requester:requester_id(full_name, email), supervisor:supervisor_id(full_name, email)`)
    .eq("id", id)
    .single();

  if (reqErr || !req) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });

  if (action === "supervisor_approve") {
    if (user.role !== "supervisor" && user.role !== "admin") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }
    if (req.status !== "pending") {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }

    const { error } = await supabase
      .from("vehicle_requests")
      .update({
        status: "supervisor_approved",
        supervisor_id: user.id,
        supervisor_approved_at: new Date().toISOString(),
        supervisor_comment: comment || null,
        supervisor_signature: signature || null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ส่งอีเมลแจ้งผู้อนุมัติ
    const { data: approvers } = await supabase.from("users").select("email").eq("role", "approver");
    if (approvers) {
      for (const a of approvers) {
        await sendEmail({
          to: a.email,
          subject: "คำขอใช้รถยนต์ - รอการอนุมัติ",
          html: buildRequestEmailHtml({
            requesterName: req.requester?.full_name || "",
            destination: req.destination,
            purpose: req.purpose,
            departureDate: req.departure_datetime,
            returnDate: req.return_datetime,
            actionUrl: `${appUrl}/request/${id}`,
            statusMessage: "ผู้บังคับบัญชาขั้นต้นอนุมัติแล้ว รอการอนุมัติจากท่าน",
          }),
        });
      }
    }

    return NextResponse.json({ success: true, status: "supervisor_approved" });
  }

  if (action === "approve") {
    if (user.role !== "approver" && user.role !== "admin") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }
    if (req.status !== "supervisor_approved") {
      return NextResponse.json({ error: "ต้องได้รับอนุมัติจากผู้บังคับบัญชาขั้นต้นก่อน" }, { status: 400 });
    }

    const { error } = await supabase
      .from("vehicle_requests")
      .update({
        status: "approved",
        approver_id: user.id,
        approved_at: new Date().toISOString(),
        approver_comment: comment || null,
        approved_vehicle_id: vehicle_id || null,
        approved_driver_name: driver_name || null,
        approver_signature: signature || null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ส่งอีเมลแจ้งผู้ขอและผู้บังคับบัญชาขั้นต้น
    const recipients = [req.requester?.email, req.supervisor?.email].filter(Boolean) as string[];
    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: "คำขอใช้รถยนต์ - อนุมัติแล้ว",
        html: buildRequestEmailHtml({
          requesterName: req.requester?.full_name || "",
          destination: req.destination,
          purpose: req.purpose,
          departureDate: req.departure_datetime,
          returnDate: req.return_datetime,
          actionUrl: `${appUrl}/request/${id}`,
          statusMessage: "คำขอใช้รถยนต์ราชการได้รับการอนุมัติแล้ว",
        }),
      });
    }

    return NextResponse.json({ success: true, status: "approved" });
  }

  if (action === "reject") {
    if (user.role !== "supervisor" && user.role !== "approver" && user.role !== "admin") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const { error } = await supabase
      .from("vehicle_requests")
      .update({
        status: "rejected",
        ...(user.role === "supervisor"
          ? { supervisor_id: user.id, supervisor_comment: comment }
          : { approver_id: user.id, approver_comment: comment }),
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
