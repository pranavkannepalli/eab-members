"use client";
// Top-bar identity: "Sign in" (links to /login) or your name, plus the notifications bell.
// Anything that needs an identity calls requestSignIn() to go to the sign-in page.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Face } from "@/ui/face";
import { userSignOut, setNotifications } from "@/app/actions";

const SEEN = "eab_seen_notices";
export const requestSignIn = () => { window.location.href = "/login"; };

type Me = { name: string; email: string; notify: boolean };
type Notice = { key: string; text: string; href: string };

export function IdentityBar({ me, member, notices }: { me: Me | null; member: boolean; notices: Notice[] }) {
  const [menu, setMenu] = useState<"bell" | "me" | null>(null);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

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
              <label className="small"><input type="checkbox" checked={me.notify} onChange={(e) => setNotifications(e.target.checked)} /> Email me club blasts</label>
              <form action={userSignOut}><button className="textbtn">Sign out</button></form>
            </div>
          )}
        </>
      ) : <Link href="/login" className="signin">Sign in</Link>}
    </div>
  );
}
