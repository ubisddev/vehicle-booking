import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("vehicles")
    .update({
      plate_number: body.plate_number,
      brand: body.brand,
      model: body.model,
      vehicle_type: body.vehicle_type,
      is_active: body.is_active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
