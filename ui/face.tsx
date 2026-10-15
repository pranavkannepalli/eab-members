// A person's face: photo when there is an http(s) URL, else initials on their color. No hooks, so server and client both use it.
import Link from "next/link";
import { avatarColor, initials } from "@/lib/format";

export function Face({ name, src, size = 40, href }: { name: string; src?: string; size?: number; href?: string }) {
  const face = src && /^https?:\/\//i.test(src)
    ? <img className="face" src={src} alt="" width={size} height={size} />
    : <span className="face" style={{ width: size, height: size, fontSize: Math.round(size / 2.8), background: avatarColor(name) }} aria-hidden>{initials(name)}</span>;
  return href ? <Link href={href} className="facelink" title={name}>{face}</Link> : face;
}

/** Where a name links: their profile when they are a member, else a search for them. */
export const personHref = (name: string, memberIds: Map<string, number>) => {
  const id = memberIds.get(name.trim().toLowerCase());
  return id ? `/directory/${id}` : `/crm/search?q=${encodeURIComponent(name)}`;
};
