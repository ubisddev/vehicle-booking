import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const supabase = getServiceSupabase();

  const updateData: Record<string, string> = {
    full_name: body.full_name,
    position: body.position,
    department: body.department,
    role: body.role,
    email: body.email,
  };

  if (body.password) {
    updateData.password_hash = await hashPassword(body.password);
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select("id, email, full_name, position, department, role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีตัวเองได้" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return NextResponse.json({ error: "ไม่สามารถลบได้ กรุณารัน SQL เปลี่ยน foreign key เป็น SET NULL ก่อน" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
