import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("departments").select("*").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "กรุณากรอกชื่อกลุ่มงาน" }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("departments").insert({ name }).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "ชื่อกลุ่มงานซ้ำ" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
