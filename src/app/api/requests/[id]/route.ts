import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vehicle_requests")
    .select(`
      *,
      requester:requester_id(id, full_name, position, department, email),
      supervisor:supervisor_id(id, full_name, position, email),
      approver:approver_id(id, full_name, position, email),
      approved_vehicle:approved_vehicle_id(id, plate_number, brand, model, vehicle_type)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { error } = await supabase.from("vehicle_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
