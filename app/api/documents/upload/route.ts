import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import storageService from "@/lib/storage";
import documentService from "@/services/document/document.service";
import { DocumentType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const formData = await request.formData();
    const rawFile = formData.get("file");

    if (!rawFile || typeof rawFile === "string" || typeof (rawFile as any).arrayBuffer !== "function") {
      return NextResponse.json(
        {
          success: false,
          message: "No valid file provided in request.",
        },
        {
          status: 400,
        }
      );
    }

    const file = rawFile as File;
    const fileName = file.name || "document.pdf";

    const allowedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/pjpeg",
    ];
    const allowedExtensions = ["pdf", "png", "jpg", "jpeg"];

    const fileExt = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.type?.toLowerCase();

    const isMimeValid = mimeType && allowedMimeTypes.includes(mimeType);
    const isExtValid = allowedExtensions.includes(fileExt);

    if (!isMimeValid && !isExtValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported file type. Allowed: PDF, PNG, JPG, JPEG",
        },
        {
          status: 400,
        }
      );
    }

    const MAX_FILE_SIZE = 4.2 * 1024 * 1024; // 4.2 MB (Vercel payload limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum upload size is 4.2MB.",
        },
        {
          status: 400,
        }
      );
    }

    const rawTitle = formData.get("title") as string | null;
    const title = rawTitle && rawTitle.trim().length > 0 ? rawTitle.trim() : fileName;

    const rawType = formData.get("type") as DocumentType | null;
    const type = rawType && Object.values(DocumentType).includes(rawType)
      ? rawType
      : DocumentType.RESUME;

    const storagePath = await storageService.uploadDocument(file);

    const document = await documentService.upload({
      userId: session.user.id,
      title,
      type,
      fileUrl: storagePath,
      fileName,
      fileSize: file.size,
      mimeType: file.type || `image/${fileExt}` || "application/octet-stream",
    });

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully.",
      document,
    });
  } catch (error: any) {
    console.error("❌ Document upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed.";
    const isValidationError =
      errorMessage.includes("No file") ||
      errorMessage.includes("No valid") ||
      errorMessage.includes("Unsupported") ||
      errorMessage.includes("Maximum upload size") ||
      errorMessage.includes("Invalid file");

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      {
        status: isValidationError ? 400 : 500,
      }
    );
  }
}