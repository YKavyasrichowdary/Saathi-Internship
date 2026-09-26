import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

import roadmapGeneratorService from "@/services/roadmap/roadmap-generator.service";

export async function POST(request: Request) {
  try {

    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields before hitting the service
    const { targetDate, opportunityId, dailyHours, confidence, goal, preferredStudyTime } = body;

    if (!targetDate || targetDate === "undefined") {
      return NextResponse.json(
        { success: false, message: "targetDate is required and must be a valid date string (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (!opportunityId) {
      return NextResponse.json(
        { success: false, message: "opportunityId is required." },
        { status: 400 }
      );
    }

    const roadmap =
      await roadmapGeneratorService.generateRoadmap({
        userId: session.user.id,
        targetDate,
        opportunityId,
        dailyHours,
        confidence,
        goal,
        preferredStudyTime,
      });

    return NextResponse.json({
      success: true,
      data: {
        id: roadmap.id,
      },
      roadmap,
    });

  } catch (error) {
    console.error("Failed to generate roadmap:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate roadmap.",
      },
      {
        status: 500,
      }
    );

  }
}