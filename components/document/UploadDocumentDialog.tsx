"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import UploadDropzone from "./UploadDropzone";

export default function UploadDocumentDialog() {

  const router = useRouter();

  const [file, setFile] =
    useState<File | null>(null);

  const [title, setTitle] =
    useState("");

  const [type, setType] =
    useState("RESUME");

  const [loading, setLoading] =
    useState(false);

  async function upload() {

    if (!file) {
      toast.error("Choose a file.");
      return;
    }

    setLoading(true);

    try {

      const form = new FormData();
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/pjpeg",
      ];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isAllowed = allowedTypes.includes(file.type.toLowerCase()) || ["pdf", "png", "jpg", "jpeg"].includes(ext);

      if (!isAllowed) {
        toast.error("Only PDF, PNG, and JPG/JPEG files are allowed.");
        setLoading(false);
        return;
      }

      if (file.size > 4.2 * 1024 * 1024) {
        toast.error("Maximum file size is 4.2MB.");
        setLoading(false);
        return;
      }

      form.append("file", file);

      form.append("title", title);

      form.append("type", type);

      const res = await fetch(
        "/api/documents/upload",
        {
          method: "POST",
          body: form,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      toast.success(
        `${title || file.name} uploaded successfully 🎉`
      );

      setFile(null);
      setTitle("");
      setType("RESUME");

      router.refresh();

    } catch (error: any) {

      toast.error(error.message);

    } finally {

      setLoading(false);

    }

  }

  return (
    <div className="surface-card rounded-2xl p-6 space-y-4">

      <input
        className="input w-full"
        placeholder="Document title"
        value={title}
        onChange={(e) =>
          setTitle(e.target.value)
        }
      />

      <select
        className="input w-full"
        value={type}
        onChange={(e) =>
          setType(e.target.value)
        }
      >
        <option value="RESUME">
          Resume
        </option>

        <option value="AADHAAR">
          Aadhaar
        </option>

        <option value="PAN">
          PAN
        </option>

        <option value="MARKS_MEMO">
          Marks Memo
        </option>

        <option value="OTHER">
          Other
        </option>

      </select>

      <UploadDropzone
    onFileSelected={setFile}
/>
{file && (

<div className="mt-4 rounded-xl border p-4">

    <p className="font-medium">

        {file.name}

    </p>

    <p className="text-sm text-muted-foreground">

        {(file.size / 1024 / 1024).toFixed(2)} MB

    </p>

</div>

)}

      <button
        onClick={upload}
        disabled={loading}
        className="btn-primary"
      >
        Upload
      </button>

    </div>
  );

}