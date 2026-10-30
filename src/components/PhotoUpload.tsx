import { useRef, useState } from "react";
import { Camera, CheckCircle } from "lucide-react";
import { BUSINESS } from "../data/content";

/**
 * Shown on the thank-you screen after a lead form submits, so the form itself
 * stays short. Files attach to the lead just created (netlify/functions/
 * lead-upload.ts) and show on it in the CRM, which saves Chris asking for
 * photos before he can give a ballpark.
 *
 * Files upload one at a time: each one updates the lead's photo list, and two
 * at once could each save over the other's.
 */

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;

// Some desktop browsers give an iPhone HEIC photo no type at all; fall back to
// the extension so it is not refused before it is even sent.
const BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};
const typeOf = (f: File): string => f.type || BY_EXT[(f.name.split(".").pop() || "").toLowerCase()] || "";
const allowed = (f: File): boolean => {
  const t = typeOf(f);
  return (t.startsWith("image/") || t === "application/pdf") && f.size > 0 && f.size <= MAX_BYTES;
};

type Status = "idle" | "uploading" | "done" | "partial";

async function post(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const res = await fetch("/.netlify/functions/lead-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
}

// The server picks the slot (one of the lead's ten, lead-upload.ts) and the
// finish call names it back.
async function uploadOne(id: string, t: string, file: File): Promise<boolean> {
  const meta = { id, t, filename: file.name };
  try {
    const start = await post({ ...meta, step: "start" });
    if (!start?.upload_url) return false;
    const put = await fetch(String(start.upload_url), {
      method: "PUT",
      headers: { "Content-Type": typeOf(file) },
      body: file,
    });
    if (!put.ok) return false;
    return Boolean(await post({ ...meta, step: "finish", slot: start.slot }));
  } catch {
    return false;
  }
}

export default function PhotoUpload({ leadId, token }: { leadId?: string; token?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [sent, setSent] = useState(0);
  const [note, setNote] = useState("");

  if (!leadId || !token) return null;

  const onPick = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const picked = Array.from(list);
    const ok = picked.filter(allowed);
    const room = Math.max(0, MAX_FILES - sent);
    const queue = ok.slice(0, room);
    const skipped = picked.length - queue.length;

    setStatus("uploading");
    setProgress({ done: 0, total: queue.length });
    let good = 0;
    for (let i = 0; i < queue.length; i++) {
      if (await uploadOne(leadId, token, queue[i])) good++;
      setProgress({ done: i + 1, total: queue.length });
    }
    setSent((n) => n + good);
    const failed = queue.length - good + skipped;
    setNote(
      failed
        ? `${failed} ${failed === 1 ? "file" : "files"} didn't upload. Photos and PDFs up to 25 MB work, ${MAX_FILES} in all.`
        : ""
    );
    setStatus(failed ? "partial" : "done");
    if (input.current) input.current.value = "";
  };

  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-white p-5 text-left">
      {status === "done" && sent > 0 ? (
        <p className="flex items-start gap-2 text-portal-dark">
          <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-600" />
          <span>
            Got {sent === 1 ? "it" : sent === 2 ? "both" : `all ${sent}`}. Chris will see {sent === 1 ? "it" : "them"} with your request.
          </span>
        </p>
      ) : (
        <>
          <p className="font-semibold text-portal-dark">Have photos or plans?</p>
          <p className="mt-1 text-sm text-portal-mid">
            Add a few and Chris can usually reply with a ballpark estimate. Optional.
          </p>
        </>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      {sent < MAX_FILES && (
        <button
          type="button"
          disabled={status === "uploading"}
          onClick={() => input.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-portal-accent px-5 py-2.5 font-semibold text-portal-accent transition-colors hover:bg-portal-cream disabled:opacity-60"
        >
          <Camera size={18} />
          {status === "uploading"
            ? `Uploading ${progress.done + 1 > progress.total ? progress.total : progress.done + 1} of ${progress.total}...`
            : sent > 0
              ? "Add more"
              : "Add photos or plans"}
        </button>
      )}

      {note && (
        <p className="mt-3 text-sm text-portal-mid">
          {note} You can also text them to{" "}
          <a href={BUSINESS.phoneHref} className="underline">
            {BUSINESS.phone}
          </a>
          .
        </p>
      )}
    </div>
  );
}
