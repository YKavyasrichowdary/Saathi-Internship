import { NextResponse } from "next/server";
import { getSupabaseStorageClient } from "@/lib/supabase-storage";

export async function GET() {
  const client = getSupabaseStorageClient();
  if (!client) {
    return NextResponse.json(
      {
        success: false,
        error: "Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are missing.",
      },
      { status: 500 }
    );
  }

  const { data, error } = await client.storage.listBuckets();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    buckets: data,
  });
}