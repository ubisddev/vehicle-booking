import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, full_name, position, department } = body;

  if (!email || !password || !full_name || !position || !department) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      email,
      password_hash: passwordHash,
      full_name,
      position,
      department,
      role: "user",
      is_approved: false,
    })
    .select("id, full_name, email")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "สมัครสำเร็จ รอผู้ดูแลระบบอนุมัติ", user: data }, { status: 201 });
}
