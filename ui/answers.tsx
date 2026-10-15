"use client";
// Post footer + answers thread. Ask posts get "answers", other posts "replies". Admins can mark a best answer or hide one.
import { useState } from "react";
import Link from "next/link";
import { Face } from "@/ui/face";
import { relTime, plural } from "@/lib/format";
import { requestSignIn } from "@/ui/identity";

export type Answer = { id: number; author: string; body: string; created_at: string; best: boolean };

export function Answers({ postId, ask, initial, admin, viewer, profiles }: {
  postId: number; ask: boolean; initial: Answer[]; admin: boolean; viewer: string | null; profiles: Record<string, string>;
}) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const noun = ask ? "answer" : "reply";
  const href = (name: string) => profiles[name.trim().toLowerCase()] || `/crm/search?q=${encodeURIComponent(name)}`;
  const sorted = [...list].sort((a, b) => Number(b.best) - Number(a.best) || a.created_at.localeCompare(b.created_at));

  async function call(url: string, init: RequestInit) {
    setError("");
    const r = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error || "Something went wrong"); return null; }
    return j;
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer || !text.trim()) return;
    setBusy(true);
    const c = await call("/api/comments", { method: "POST", body: JSON.stringify({ post_id: postId, author: viewer, body: text }) });
    setBusy(false);
    if (c) { setList([...list, c]); setText(""); }
  }
  async function markBest(a: Answer) {
    const c = await call(`/api/comments/${a.id}`, { method: "PATCH", body: JSON.stringify({ best: !a.best }) });
    if (c) setList(list.map((x) => ({ ...x, best: x.id === a.id ? c.best : c.best ? false : x.best })));
  }
  async function hide(a: Answer) {
    if (await call(`/api/comments/${a.id}`, { method: "PATCH", body: JSON.stringify({ hidden: true }) })) setList(list.filter((x) => x.id !== a.id));
  }

  return (
    <>
      <div className="pfoot">
        <button type="button" className="textbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
          💬 {list.length ? plural(list.length, noun, ask ? "answers" : "replies") : ask ? "Add an answer" : "Reply"}
        </button>
        {ask && list.some((a) => a.best) && <span className="bestpill">Answered</span>}
      </div>
      {open && (
        <div className="answers">
          {sorted.map((a) => (
            <div key={a.id} className={`ans${a.best ? " best" : ""}`}>
              <Face name={a.author} size={28} href={href(a.author)} />
              <div className="abody">
                <p className="awho"><Link href={href(a.author)}>{a.author}</Link> <span className="pmeta" suppressHydrationWarning>{relTime(a.created_at)}</span>
                  {a.best && <span className="bestpill">Best answer</span>}</p>
                <p className="atext">{a.body}</p>
                {admin && <p className="amod">
                  {ask && <button type="button" className="textbtn" onClick={() => markBest(a)}>{a.best ? "Unmark best" : "Mark best"}</button>}
                  <button type="button" className="textbtn" onClick={() => hide(a)}>Hide</button>
                </p>}
              </div>
            </div>
          ))}
          {viewer ? (
            <form className="answerbox" onSubmit={submit}>
              <Face name={viewer} size={28} />
              <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={ask ? "Write an answer…" : "Write a reply…"} aria-label={`Write ${noun === "answer" ? "an answer" : "a reply"}`} />
              <button className="btn" disabled={busy || !text.trim()}>{busy ? "…" : ask ? "Answer" : "Reply"}</button>
            </form>
          ) : <p className="small"><button type="button" className="textbtn" onClick={requestSignIn}>Sign in to {noun} →</button></p>}
          {error && <p className="err small">{error}</p>}
        </div>
      )}
    </>
  );
}
