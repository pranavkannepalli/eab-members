import "./globals.css";
export const metadata = { title: "E@B Members · Entrepreneurs at Berkeley" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
