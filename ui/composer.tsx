"use client";
// Home feed composer: one textarea, an optional post type, Post. The first line becomes the title (or the question, for an Ask).
import { useActionState, useState } from "react";
import { postUpdate } from "@/app/actions";
import { Face } from "@/ui/face";

export function Composer({ author, categories }: { author: string; categories: string[] }) {
  const [kind, setKind] = useState("Update");
  const [showLink, setShowLink] = useState(false);
  const [, action, pending] = useActionState(async (_: null, fd: FormData) => { await postUpdate(fd); return null; }, null);
  return (
    <form action={action} className="card composer">
      <Face name={author} size={40} />
      <div className="cbody">
        <textarea name="text" rows={2} required aria-label="Write a post"
          placeholder={kind === "Ask" ? "Ask the club a question… The first line is your question." : "What's new? The first line becomes the title."} />
        {showLink && <input name="link" type="url" placeholder="Paste a link (optional)" className="clink" />}
        <div className="crow">
          <select name="category" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Post type">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          {!showLink && <button type="button" className="textbtn" onClick={() => setShowLink(true)}>+ Add link</button>}
          <label className="textbtn"><input type="checkbox" name="status" value="Pinned" /> Pin to top</label>
          <span className="muted small grow">Posting as {author}</span>
          <input type="hidden" name="author" value={author} />
          <button className="btn" disabled={pending}>{pending ? "Posting…" : "Post"}</button>
        </div>
      </div>
    </form>
  );
}
