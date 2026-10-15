"use client";
// Top-bar identity: "Sign in" (name + email, unverified, stored in the eab_identity cookie) or your name, plus the notifications bell.
// Anything that needs an identity calls requestSignIn() to open the modal.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Face } from "@/ui/face";

const COOKIE = "eab_identity";
const SEEN = "eab_seen_notices";
export const requestSignIn = () => window.dispatchEvent(new Event("eab:signin"));

type Me = { name: string; email: string; source: "cookie" | "session" };
type Notice = { key: string; text: string; href: string };

function SignInModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  function save(e: React.FormEvent) {
    e.preventDefault();
    const v = encodeURIComponent(JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }));
    document.cookie = `${COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    onClose();
    router.refresh();
  }
  return (
    <div className="modalback" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card modal" onSubmit={save} role="dialog" aria-modal aria-labelledby="signin-title">
        <h2 id="signin-title">Who's this?</h2>
        <p className="muted small">We'll use this when you claim deals, RSVP and answer posts. Use the email E@B has for you so you show up as a member.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoFocus />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@berkeley.edu" required />
        <div className="row"><button className="btn">Continue</button><button type="button" className="btn ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </div>
  );
}

export function IdentityBar({ me, member, notices }: { me: Me | null; member: boolean; notices: Notice[] }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState<"bell" | "me" | null>(null);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = () => setModal(true);
    window.addEventListener("eab:signin", open);
    return () => window.removeEventListener("eab:signin", open);
  }, []);
  // "Read" state lives in this browser only; there is no notifications table.
  useEffect(() => {
    const seen: string[] = JSON.parse(localStorage.getItem(SEEN) || "[]");
    setUnread(notices.filter((n) => !seen.includes(n.key)).length);
  }, [notices]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  function openBell() {
    setMenu(menu === "bell" ? null : "bell");
    localStorage.setItem(SEEN, JSON.stringify(notices.map((n) => n.key)));
    setUnread(0);
  }
  function signOut() {
    document.cookie = `${COOKIE}=; path=/; max-age=0`;
    setMenu(null);
    router.refresh();
  }

  return (
    <div className="idbar" ref={ref}>
      {me ? (
        <>
          <button type="button" className="bell" onClick={openBell} aria-label={`Notifications${unread ? ` (${unread} new)` : ""}`} aria-expanded={menu === "bell"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {unread > 0 && <span className="dot">{unread}</span>}
          </button>
          <button type="button" className="mebtn" onClick={() => setMenu(menu === "me" ? null : "me")} aria-expanded={menu === "me"}>
            <Face name={me.name} size={26} /><span className="mename">{me.name.split(/\s+/)[0]}</span>
            {member && <span className="memberpill">Member</span>}
          </button>
          {menu === "bell" && (
            <div className="popover">
              <p className="eyebrow">Notifications</p>
              {notices.length === 0 && <p className="muted small">You're all caught up.</p>}
              {notices.map((n) => <Link key={n.key} href={n.href} onClick={() => setMenu(null)}>{n.text}</Link>)}
            </div>
          )}
          {menu === "me" && (
            <div className="popover">
              <p className="small"><b>{me.name}</b><br /><span className="muted">{me.email}</span></p>
              {me.source === "cookie" ? <button type="button" className="textbtn" onClick={signOut}>Sign out</button>
                : <p className="muted small">Signed in with Google.</p>}
            </div>
          )}
        </>
      ) : <button type="button" className="signin" onClick={() => setModal(true)}>Sign in</button>}
      {modal && <SignInModal onClose={() => setModal(false)} />}
    </div>
  );
}
