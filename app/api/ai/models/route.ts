import { NextResponse } from "next/server";

// The custom gemini wrapper in lib/ai/gemini.ts does not proxy the
// models.list() endpoint — it manages its own model fallback pool internally.
// Return the supported models statically instead.
const SUPPORTED_MODELS = [
  { name: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash" },
  { name: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
  { name: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash" },
  { name: "gemini-flash-latest", displayName: "Gemini Flash (Latest)" },
];

export async function GET() {
  try {
    return NextResponse.json(SUPPORTED_MODELS);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}