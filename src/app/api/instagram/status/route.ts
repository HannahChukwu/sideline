import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ connected: false }, { status: 500 });
  }

  return NextResponse.json({
    connected: Boolean(data?.ig_user_id),
    ig_user_id: data?.ig_user_id ?? null,
  });
}

