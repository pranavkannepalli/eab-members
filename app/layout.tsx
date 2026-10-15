import "./globals.css";
export const metadata = { title: "E@B Members" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
