import { randomUUID } from "crypto";
import { getSupabaseStorageClient } from "./supabase-storage";
import fs from "fs/promises";
import path from "path";

class StorageService {
  private async ensureSupabaseBucket(supabase: any): Promise<boolean> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (!error && buckets) {
        const exists = buckets.some((b: any) => b.name === "documents");
        if (!exists) {
          await supabase.storage.createBucket("documents", { public: true });
        }
        return true;
      }
    } catch (e) {
      console.warn("Could not check/create Supabase bucket:", e);
    }
    return false;
  }

  async uploadDocument(file: File): Promise<string> {
    if (!file || typeof file.arrayBuffer !== "function") {
      throw new Error("Invalid file object provided for upload.");
    }

    const extension = (file.name || "document.pdf").split(".").pop()?.toLowerCase() || "pdf";
    const fileName = `${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getSupabaseStorageClient();

    if (supabase) {
      try {
        await this.ensureSupabaseBucket(supabase);

        const { data, error } = await supabase.storage
          .from("documents")
          .upload(fileName, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });

        if (!error && data?.path) {
          return data.path;
        }

        console.warn("⚠️ Supabase storage upload warning, saving locally:", error?.message);
      } catch (err: any) {
        console.warn("⚠️ Supabase storage error, saving locally:", err?.message || err);
      }
    } else {
      console.warn("⚠️ Supabase storage credentials missing, attempting local storage fallback.");
    }

    return await this.uploadLocal(fileName, buffer);
  }

  private async uploadLocal(fileName: string, buffer: Buffer): Promise<string> {
    const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";

    if (isServerless) {
      try {
        const tmpDir = path.join("/tmp", "uploads");
        await fs.mkdir(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, fileName);
        await fs.writeFile(filePath, buffer);
        return `/uploads/${fileName}`;
      } catch (err: any) {
        throw new Error(
          "Storage service unavailable: Supabase storage credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured."
        );
      }
    }

    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      return `/uploads/${fileName}`;
    } catch (err: any) {
      throw new Error(`Failed to write file to local disk: ${err?.message || "Storage error"}`);
    }
  }

  async deleteDocument(pathStr: string) {
    if (pathStr.startsWith("/uploads/")) {
      try {
        const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";
        const basePath = isServerless ? "/tmp" : path.join(process.cwd(), "public");
        const localPath = path.join(basePath, pathStr);
        await fs.unlink(localPath);
      } catch (err) {
        console.warn("Failed to delete local file:", err);
      }
      return;
    }

    const supabase = getSupabaseStorageClient();
    if (!supabase) return;

    try {
      const { error } = await supabase.storage
        .from("documents")
        .remove([pathStr]);

      if (error) {
        console.warn("Failed to delete Supabase document:", error.message);
      }
    } catch (err) {
      console.warn("Supabase delete error:", err);
    }
  }

  async getSignedUrl(pathStr: string): Promise<string> {
    if (
      pathStr.startsWith("/uploads/") ||
      pathStr.startsWith("http://") ||
      pathStr.startsWith("https://")
    ) {
      return pathStr;
    }

    const supabase = getSupabaseStorageClient();
    if (!supabase) return pathStr;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(pathStr, 60 * 60);

      if (error || !data?.signedUrl) {
        return pathStr;
      }

      return data.signedUrl;
    } catch {
      return pathStr;
    }
  }

  async getFileBuffer(pathStr: string): Promise<Buffer> {
    if (pathStr.startsWith("/uploads/")) {
      const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";
      const basePath = isServerless ? "/tmp" : path.join(process.cwd(), "public");
      const localPath = path.join(basePath, pathStr);
      try {
        return await fs.readFile(localPath);
      } catch (err) {
        throw new Error(
          "Document file not found on storage server. Please re-upload the document."
        );
      }
    }

    if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) {
      try {
        const res = await fetch(pathStr);
        if (!res.ok) throw new Error("Failed to fetch document file.");
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch {
        throw new Error(
          "Document file could not be fetched. Please re-upload the document."
        );
      }
    }

    const supabase = getSupabaseStorageClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from("documents")
          .download(pathStr);

        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err: any) {
        console.warn("⚠️ Supabase download error, checking local fallback:", err?.message || err);
      }
    }

    const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";
    const basePath = isServerless ? "/tmp" : path.join(process.cwd(), "public");
    const localPath = path.join(basePath, pathStr.startsWith("/") ? pathStr : `/uploads/${pathStr}`);
    try {
      return await fs.readFile(localPath);
    } catch {
      throw new Error(
        "Document file not found on storage server. Please re-upload the document."
      );
    }
  }
}

export default new StorageService();