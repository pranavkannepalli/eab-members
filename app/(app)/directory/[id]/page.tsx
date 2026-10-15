import { redirect } from "next/navigation";

// Member profiles live at /crm/members/<id>; keep old directory links working.
export default async function DirectoryProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/crm/members/${encodeURIComponent(id)}`);
}
