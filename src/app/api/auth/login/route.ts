import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { createToken, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("password_hash", passwordHash)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  if (!user.is_approved) {
    return NextResponse.json({ error: "บัญชีของท่านยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ" }, { status: 403 });
  }

  const token = createToken(user.id);
  return NextResponse.json({ token, user: { id: user.id, full_name: user.full_name, role: user.role } });
}
