// @ts-nocheck
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false });

  const { data: sellers } = await supabase
    .from("sellers")
    .select("id, user_id, store_name, approved, created_at");

  return NextResponse.json({
    success: true,
    data: { users, sellers },
  });
}

export async function POST(request: Request) {
  const { userId, role } = await request.json();

  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: "Missing userId or role" },
      { status: 400 }
    );
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
