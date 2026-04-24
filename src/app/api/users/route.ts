import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from("users").select("id, email, full_name, position, department, role, is_approved, created_at").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const supabase = getServiceSupabase();

  const passwordHash = await hashPassword(body.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      email: body.email,
      password_hash: passwordHash,
      full_name: body.full_name,
      position: body.position,
      department: body.department,
      role: body.role || "user",
    })
    .select("id, email, full_name, position, department, role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
