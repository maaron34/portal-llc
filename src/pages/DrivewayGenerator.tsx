import { useCallback, useEffect, useRef, useState } from "react";
import { BUSINESS } from "../data/content";
import { track } from "../lib/analytics";
import { attributionPayload } from "../lib/attribution";
import { submitLead } from "../lib/lead-capture";
import { isUsPhone } from "../lib/lead-fields";
import { trackOpenAILead } from "../lib/openai-pixel";
import { PHOTO_MESSAGES, preparePhoto, type PreparedPhoto } from "../lib/driveway-photo";
import { JOB_TYPES, PRODUCT_NAME, isJobType, type JobType } from "../lib/driveway-shared";
import "./driveway-generator.css";

/**
 * The Driveway Generator: a homeowner adds a photo of their old concrete, says
 * what it is, leaves a name and number, waits about a minute, and sees their own
 * photo with new plain gray concrete in a before/after slider.
 *
 * Not linked from anywhere and marked noindex. The page asks the server whether
 * the tool is switched on (DRIVEWAY_GENERATOR_ENABLED) before it shows anything.
 *
 * The lead is created through the same submit-lead call every other form uses,
 * marked with the product name so these leads can be compared with Free
 * estimate leads. The server side is netlify/lib/driveway-core.ts.
 */

type View = "loading" | "off" | "photo" | "contact" | "working" | "result" | "failed" | "limit";
type LimitReason = "phone" | "ip" | "cap";
type Estimate = "idle" | "sending" | "sent" | "error";
type Result = { before: string; after: string; width: number; height: number; jobType: string };

/** What a reload needs to pick the wait back up. Per tab, gone when the tab closes. */
type Saved = { leadId: string; uploadToken: string; key: string; jobType: JobType; name: string; phone: string; job?: string; t?: string; photoOnLead?: boolean };
const SAVE_KEY = "portal_driveway_generator";
const loadSaved = (): Saved | null => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null") as Saved | null;
    return v && v.leadId && v.uploadToken && v.key && isJobType(v.jobType) ? v : null;
  } catch {
    return null;
  }
};
const save = (v: Saved | null): void => {
  try {
    if (v) sessionStorage.setItem(SAVE_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(SAVE_KEY);
  } catch {
    /* private mode: a reload simply starts over */
  }
};

const LIVE_HOST = "buildwithportal.com";
const START = "/.netlify/functions/driveway-start";
const STATUS = "/.netlify/functions/driveway-status";
const POLL_MS = 2500;
const GIVE_UP_MS = 6 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newKey = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16));

const waitLine = (seconds: number, job: string): string => {
  if (seconds < 7) return "Reading your photo";
  if (seconds < 18) return `Finding the old ${job.toLowerCase()}`;
  if (seconds < 32) return "Breaking out the old concrete";
  if (seconds < 48) return "Pouring new concrete";
  if (seconds < 62) return "Broom finish";
  return "Checking the picture";
};

function Robot() {
  return (
    <svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="74" y="4" width="12" height="16" rx="3" fill="#6b6b6b" />
      <circle cx="80" cy="6" r="6" fill="#fbbf24" />
      <rect x="34" y="18" width="92" height="56" rx="14" fill="#d4cfc7" />
      <rect x="46" y="30" width="68" height="32" rx="8" fill="#1a1a1a" />
      <circle className="dg-eye" cx="64" cy="46" r="7" fill="#7fb89c" />
      <circle className="dg-eye" cx="96" cy="46" r="7" fill="#7fb89c" />
      <rect x="70" y="74" width="20" height="8" fill="#6b6b6b" />
      <rect x="28" y="82" width="104" height="56" rx="12" fill="#e8e5e0" />
      <rect x="44" y="94" width="72" height="20" rx="4" fill="#3d7a5f" />
      <rect x="50" y="100" width="12" height="8" rx="2" fill="#7fb89c" />
      <rect x="66" y="100" width="12" height="8" rx="2" fill="#7fb89c" />
      <rect x="82" y="100" width="12" height="8" rx="2" fill="#7fb89c" />
      <rect x="98" y="100" width="12" height="8" rx="2" fill="#7fb89c" />
      <rect x="44" y="120" width="72" height="8" rx="4" fill="#6b6b6b" />
      <rect x="8" y="90" width="20" height="10" rx="5" fill="#d4cfc7" />
      <g className="dg-arm">
        <rect x="118" y="90" width="34" height="10" rx="5" fill="#d4cfc7" />
        <rect x="146" y="78" width="10" height="26" rx="3" fill="#6b6b6b" />
      </g>
      <rect x="40" y="138" width="20" height="10" rx="3" fill="#4a4a4a" />
      <rect x="100" y="138" width="20" height="10" rx="3" fill="#4a4a4a" />
    </svg>
  );
}

/** Before on the left, after on the right, one handle. Nudges itself once so people see it moves. */
function BeforeAfter({ result, onStale }: { result: Result; onStale: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const moved = useRef(false);
  const raf = useRef(0);

  const setCut = (v: number) => box.current?.style.setProperty("--cut", `${v}%`);
  const stop = () => {
    moved.current = true;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  };
  const nudge = useCallback(() => {
    if (moved.current || raf.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / 2400);
      const v = 50 + 22 * Math.sin(p * Math.PI * 4) * (1 - p);
      if (range.current) range.current.value = String(v);
      setCut(v);
      raf.current = p < 1 && !moved.current ? requestAnimationFrame(frame) : 0;
    };
    raf.current = requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(nudge, 700);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf.current);
    };
  }, [nudge]);

  const job = result.jobType.toLowerCase();
  return (
    <div
      className="dg-ba"
      ref={box}
      style={{ aspectRatio: `${result.width} / ${result.height}` }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") nudge();
      }}
    >
      <img src={result.before} alt={`Before: your ${job} today`} onError={onStale} />
      <img className="dg-top" src={result.after} alt={`After: your ${job} in new gray concrete`} onError={onStale} />
      <span className="dg-handle" />
      <span className="dg-tag dg-tag-b">BEFORE</span>
      <span className="dg-tag dg-tag-a">AFTER</span>
      <input
        ref={range}
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        aria-label="Slide between before and after"
        onPointerDown={stop}
        onKeyDown={stop}
        onInput={(e) => {
          stop();
          setCut(Number(e.currentTarget.value));
        }}
      />
    </div>
  );
}

export default function DrivewayGenerator() {
  const [view, setView] = useState<View>("loading");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [reading, setReading] = useState(false);
  const [jobType, setJobType] = useState<JobType | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [limit, setLimit] = useState<LimitReason>("cap");
  const [estimate, setEstimate] = useState<Estimate>("idle");
  // True once the server has saved the photo on the lead; the failure screens only say so when it is.
  const [photoOnFile, setPhotoOnFile] = useState(false);
  const saved = useRef<Saved | null>(null);
  const photoRef = useRef<PreparedPhoto | null>(null);
  const refreshed = useRef(false);

  // Unlisted page: keep it out of search results, and give the tab a title.
  useEffect(() => {
    const title = document.title;
    document.title = PRODUCT_NAME;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = title;
      meta.remove();
    };
  }, []);

  // Is the tool switched on? Then pick up a wait or a result this tab already had.
  useEffect(() => {
    let live = true;
    (async () => {
      let enabled = false;
      try {
        const res = await fetch(START, { method: "GET" });
        enabled = res.ok && ((await res.json()) as { enabled?: boolean }).enabled === true;
      } catch {
        enabled = false;
      }
      if (!live) return;
      if (!enabled) return setView("off");
      const s = loadSaved();
      if (s) {
        saved.current = s;
        setJobType(s.jobType);
        setName(s.name);
        setPhone(s.phone);
        setPhotoOnFile(s.photoOnLead === true);
        setView("working");
      } else {
        setView("photo");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const showResult = useCallback((d: Record<string, unknown>) => {
    const local = photoRef.current;
    const r: Result = {
      // The photo already in this tab is the same picture and shows at once.
      before: local ? local.url : String(d.before_url),
      after: String(d.after_url),
      width: Number(d.width) || local?.width || 4,
      height: Number(d.height) || local?.height || 3,
      jobType: String(d.job_type || saved.current?.jobType || "concrete"),
    };
    const img = new Image();
    const done = () => {
      setResult(r);
      setView("result");
      track("driveway_generator_result", { job_type: r.jobType });
    };
    img.onload = done;
    img.onerror = done;
    img.src = r.after;
  }, []);

  // The wait: ask the server every few seconds until the picture is done or has failed.
  useEffect(() => {
    if (view !== "working") return;
    let live = true;
    const began = Date.now();
    setSeconds(0);
    const tick = window.setInterval(() => setSeconds(Math.round((Date.now() - began) / 1000)), 1000);

    (async () => {
      let misses = 0;
      while (live) {
        const s = saved.current;
        if (!s || Date.now() - began > GIVE_UP_MS) break;
        try {
          const body = s.job ? { job: s.job, t: s.t } : { lead_id: s.leadId, t: s.uploadToken, key: s.key };
          const res = await fetch(STATUS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!live) return;
          if (res.status === 403 || res.status === 404) break;
          const d = res.ok ? ((await res.json()) as Record<string, unknown>) : null;
          if (d && typeof d.job === "string" && typeof d.t === "string" && (s.job !== d.job || s.t !== d.t)) {
            saved.current = { ...s, job: d.job, t: d.t };
            save(saved.current);
          }
          if (d?.status === "done") return showResult(d);
          if (d?.status === "failed") break;
          // "none": a reload landed before the server had a job for this request. Give it a little while.
          if (d?.status === "none" && ++misses > 8) break;
        } catch {
          /* offline for a moment: keep asking */
        }
        await sleep(POLL_MS);
      }
      if (live) setView("failed");
    })();

    return () => {
      live = false;
      window.clearInterval(tick);
    };
  }, [view, showResult]);

  const pick = useRef(0);
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    // If a second photo is chosen while the first is still opening, only the latest one counts.
    const mine = ++pick.current;
    setError("");
    setReading(true);
    const r = await preparePhoto(file);
    if (mine !== pick.current) {
      if (r.ok) URL.revokeObjectURL(r.photo.url);
      return;
    }
    setReading(false);
    if (!r.ok) return setError(PHOTO_MESSAGES[r.problem]);
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    photoRef.current = r.photo;
    setPhoto(r.photo);
  };

  useEffect(
    () => () => {
      pick.current++;
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    },
    []
  );

  const next = () => {
    if (!photo) return setError("Add a photo first.");
    if (!jobType) return setError("Choose what the concrete is.");
    setError("");
    setView("contact");
    track("driveway_generator_photo_added", { job_type: jobType });
  };

  const leadFields = (message: string) => ({
    name: name.trim(),
    phone: phone.trim(),
    project_type: jobType,
    message,
    source: PRODUCT_NAME,
    ...attributionPayload(),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !photo || !isJobType(jobType)) return;
    if (name.trim().split(/\s+/).length < 2) return setError("Add your first and last name.");
    if (!isUsPhone(phone)) return setError("Enter a 10-digit mobile number.");
    setError("");
    setBusy(true);
    try {
      // 1. The lead, through the same door as every other form.
      const lead = await submitLead(leadFields(`${PRODUCT_NAME}: ${jobType.toLowerCase()}. Their photo is attached.`));
      if (!lead.ok) return setError(lead.error || `Something went wrong. Please call us at ${BUSINESS.phone}.`);
      // Ad pixels count a lead only on the live site, never from a preview, a test or localhost.
      if (window.location.hostname === LIVE_HOST && !navigator.webdriver) {
        if (window.fbq) window.fbq("track", "Lead");
        trackOpenAILead();
      }
      track("driveway_generator_lead", { job_type: jobType });
      if (!lead.id || !lead.upload_token) return setView("failed");

      // 2. The picture. The key makes a second tap or a re-send the same request, never a second picture.
      const s: Saved = { leadId: lead.id, uploadToken: lead.upload_token, key: newKey(), jobType, name: name.trim(), phone: phone.trim() };
      saved.current = s;
      save(s);
      // Did the server possibly take the request even though no answer came back?
      let unsure = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const form = new FormData();
        form.set("lead_id", s.leadId);
        form.set("t", s.uploadToken);
        form.set("key", s.key);
        form.set("job_type", s.jobType);
        form.set("photo", photo.blob, "photo.jpg");
        let res: Response;
        try {
          res = await fetch(START, { method: "POST", body: form });
        } catch {
          unsure = true;
          await sleep(1500 * (attempt + 1));
          continue;
        }
        const d = (await res.json().catch(() => ({}))) as { ok?: boolean; job?: string; t?: string; error?: string; reason?: LimitReason; photo_on_lead?: boolean };
        if (res.ok && d.job && d.t) {
          saved.current = { ...s, job: d.job, t: d.t, photoOnLead: d.photo_on_lead === true };
          save(saved.current);
          setPhotoOnFile(d.photo_on_lead === true);
          return setView("working");
        }
        if (res.status === 429) {
          setPhotoOnFile(d.photo_on_lead === true);
          setLimit(d.reason || "cap");
          save(null);
          return setView("limit");
        }
        if (res.status === 400 && d.error) {
          // Something about the photo itself. Chris already has their name and number.
          save(null);
          setError(d.error);
          return setView("photo");
        }
        if (res.status >= 500) {
          unsure = true;
          await sleep(1500 * (attempt + 1));
          continue;
        }
        unsure = false;
        break;
      }
      // A picture may be on its way even though we never heard back. Keep the
      // request and let the wait screen look for it; it gives up by itself if there is none.
      if (unsure) return setView("working");
      save(null);
      setView("failed");
    } finally {
      setBusy(false);
    }
  };

  const askForEstimate = async () => {
    if (estimate === "sending" || estimate === "sent") return;
    setEstimate("sending");
    const s = saved.current;
    const who = s ? { name: s.name, phone: s.phone, project_type: s.jobType } : {};
    const r = await submitLead({ ...leadFields(`Asked for a free estimate from the ${PRODUCT_NAME}.`), ...who, source: `${PRODUCT_NAME} - estimate request` });
    setEstimate(r.ok ? "sent" : "error");
    if (r.ok) track("driveway_generator_estimate", { job_type: String(s?.jobType || jobType) });
  };

  const startOver = () => {
    save(null);
    saved.current = null;
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    photoRef.current = null;
    refreshed.current = false;
    setPhoto(null);
    setResult(null);
    setJobType("");
    setError("");
    setEstimate("idle");
    setPhotoOnFile(false);
    setView("photo");
  };

  // A picture link lasts 15 minutes. If one has expired (a tab left open), fetch fresh links once.
  const refreshLinks = async () => {
    const s = saved.current;
    if (refreshed.current || !s?.job) return;
    refreshed.current = true;
    try {
      const res = await fetch(STATUS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: s.job, t: s.t }) });
      const d = res.ok ? ((await res.json()) as Record<string, unknown>) : null;
      if (d?.status === "done") {
        photoRef.current = null;
        return showResult(d);
      }
    } catch {
      /* fall through */
    }
    setView("failed");
  };

  const step = view === "photo" ? 1 : view === "contact" ? 2 : view === "working" ? 3 : view === "result" || view === "failed" || view === "limit" ? 4 : 0;
  const jobWord = (result?.jobType || jobType || "concrete").toLowerCase();

  const estimateBlock = (
    <>
      {estimate === "sent" ? (
        <p role="status">Chris has your request and will be in touch.</p>
      ) : (
        <button className="dg-btn" type="button" onClick={askForEstimate} disabled={estimate === "sending"}>
          Get a free estimate
        </button>
      )}
      {estimate === "error" && (
        <p className="dg-err" role="alert">
          That did not go through. Call us at{" "}
          <a className="dg-tel" href={BUSINESS.phoneHref}>
            {BUSINESS.phone}
          </a>
          .
        </p>
      )}
    </>
  );

  return (
    <div className="dg">
      <div className="dg-page">
        <section className={`dg-machine${view === "working" ? " dg-working" : ""}`} aria-live="polite">
          <h1 className="dg-name">
            {PRODUCT_NAME}
            <small>See new concrete on your own photo</small>
          </h1>
          <div className="dg-robot" aria-hidden="true">
            <Robot />
          </div>
          <div className="dg-lights" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          {step > 0 && (
            <div className="dg-steps" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={n <= step ? "dg-on" : ""} />
              ))}
            </div>
          )}

          {view === "loading" && (
            <div className="dg-screen">
              <p>Starting up</p>
            </div>
          )}

          {view === "off" && (
            <div className="dg-screen">
              <h2>The generator is switched off right now</h2>
              <a className="dg-btn" href="/contact#estimate-form">
                Get a free estimate
              </a>
            </div>
          )}

          {view === "photo" && (
            <div className="dg-screen">
              <h2>Show us the concrete you want redone</h2>
              <label className="dg-drop">
                <input type="file" accept="image/*" aria-label="Add a photo" disabled={reading} onChange={(e) => pickPhoto(e.target.files?.[0])} />
                {photo && <img className="dg-thumb" src={photo.url} alt="Your photo" />}
                <span className="dg-big">{reading ? "Opening your photo" : photo ? "Photo added" : "Add a photo"}</span>
                <span className="dg-small">{photo ? "Tap to choose a different one" : "From your camera or your photos"}</span>
              </label>
              <label className="dg-field">
                What is it?
                <select value={jobType} onChange={(e) => setJobType(isJobType(e.target.value) ? e.target.value : "")}>
                  <option value="">Choose one</option>
                  {JOB_TYPES.map((j) => (
                    <option key={j}>{j}</option>
                  ))}
                </select>
              </label>
              {error && (
                <p className="dg-err" role="alert">
                  {error}
                </p>
              )}
              <button className="dg-btn" type="button" onClick={next} disabled={reading}>
                Next
              </button>
            </div>
          )}

          {view === "contact" && (
            <div className="dg-screen">
              <h2>Who is this picture for?</h2>
              <form onSubmit={submit} noValidate>
                <label className="dg-field">
                  First and last name
                  <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="dg-field">
                  Mobile number
                  <input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                {error && (
                  <p className="dg-err" role="alert">
                    {error}
                  </p>
                )}
                <button className="dg-btn" type="submit" disabled={busy}>
                  {busy ? "Sending your photo" : "Make my picture"}
                </button>
              </form>
              <p className="dg-note">
                Chris at Portal will see your photo and may call about a free estimate. An AI service processes your photo to make the picture.
              </p>
            </div>
          )}

          {view === "working" && (
            <div className="dg-screen">
              <h2>Working on it</h2>
              <div className="dg-readout">{waitLine(seconds, jobWord)}</div>
              <div className="dg-meter" role="progressbar" aria-label="Making your picture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(92 * (1 - Math.exp(-seconds / 35)))}>
                <b style={{ width: `${Math.max(3, 92 * (1 - Math.exp(-seconds / 35)))}%` }} />
              </div>
              <p>This takes about a minute</p>
            </div>
          )}

          {view === "result" && result && (
            <div className="dg-screen">
              <h2>Here is your {jobWord} idea</h2>
              <BeforeAfter result={result} onStale={refreshLinks} />
              <p>Drag across the picture to compare</p>
              {estimateBlock}
              <p className="dg-fine">An AI concept picture. Chris confirms the design, size and finish on site.</p>
              <button className="dg-link" type="button" onClick={startOver}>
                Try another photo
              </button>
            </div>
          )}

          {view === "failed" && (
            <div className="dg-screen">
              <h2>We could not make your picture</h2>
              <p>{photoOnFile ? "Chris has your photo and can still give you a free estimate." : "Chris can still give you a free estimate."}</p>
              {estimateBlock}
              <button className="dg-link" type="button" onClick={startOver}>
                Try another photo
              </button>
            </div>
          )}

          {view === "limit" && (
            <div className="dg-screen">
              <h2>{limit === "cap" ? "The generator is full for today" : "That is all the pictures for today"}</h2>
              <p>{photoOnFile ? "Chris has your photo and can still give you a free estimate." : "Chris can still give you a free estimate."}</p>
              {estimateBlock}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
