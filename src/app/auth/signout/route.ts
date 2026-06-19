import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/supabase/auth";

export async function POST(request: NextRequest) {
  const { supabase } = await requireUser();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export async function GET(request: NextRequest) {
  const { supabase } = await requireUser();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
