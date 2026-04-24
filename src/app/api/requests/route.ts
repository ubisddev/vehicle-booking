import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { sendEmail, buildRequestEmailHtml } from "@/lib/email";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vehicle_requests")
    .select(`
      *,
      requester:requester_id(id, full_name, position, department, email),
      supervisor:supervisor_id(id, full_name, position, email),
      approver:approver_id(id, full_name, position, email),
      approved_vehicle:approved_vehicle_id(id, plate_number, brand, model)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vehicle_requests")
    .insert({
      requester_id: user.id,
      request_date: new Date().toISOString().split("T")[0],
      departure_datetime: body.departure_datetime,
      return_datetime: body.return_datetime,
      destination: body.destination,
      purpose: body.purpose,
      passengers: body.passengers || null,
      requester_signature: body.requester_signature || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ส่งอีเมลแจ้งผู้บังคับบัญชาขั้นต้นทุกคน
  const { data: supervisors } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("role", "supervisor");

  if (supervisors) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    for (const sup of supervisors) {
      await sendEmail({
        to: sup.email,
        subject: "คำขอใช้รถยนต์ราชการใหม่",
        html: buildRequestEmailHtml({
          requesterName: user.full_name,
          destination: body.destination,
          purpose: body.purpose,
          departureDate: body.departure_datetime,
          returnDate: body.return_datetime,
          actionUrl: `${appUrl}/request/${data.id}`,
          statusMessage: `มีคำขอใช้รถยนต์ราชการใหม่จาก ${user.full_name} รอการอนุมัติจากท่าน`,
        }),
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
