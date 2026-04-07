import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file provided" },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { success: false, error: "Only images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: "File must be smaller than 5MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop();
  const fileName = `${user.id}/${randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, Buffer.from(bytes), {
      contentType: file.type,
    });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return NextResponse.json({ success: true, url: publicUrl });
}
