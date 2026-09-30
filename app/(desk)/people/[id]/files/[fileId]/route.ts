import { notFound } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { databaseReady, db } from "@/lib/db";
import { attachmentDisposition, readStoredFile } from "@/lib/files";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  if (!databaseReady() || !(await isSignedIn())) {
    return new Response("Sign in required.", { status: 401 });
  }
  const { id, fileId } = await params;
  const personId = Number(id);
  const memberFileId = Number(fileId);
  if (!Number.isInteger(personId) || personId <= 0 || !Number.isInteger(memberFileId) || memberFileId <= 0) notFound();
  const file = await db.memberFile(personId, memberFileId);
  if (!file) notFound();
  const bytes = await readStoredFile(file.storage_path);
  if (!bytes) notFound();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": file.content_type,
      "Content-Disposition": attachmentDisposition(file.file_name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
