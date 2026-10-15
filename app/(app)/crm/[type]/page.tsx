import { notFound } from "next/navigation";
import { bySlug } from "@/lib/schema";
import { CrmTabs, CrmList, ListParams } from "@/ui/crm-list";
export const dynamic = "force-dynamic";

export default async function List({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: Promise<ListParams> }) {
  const { type } = await params;
  const cfg = bySlug(type);
  if (!cfg) notFound();
  return (
    <>
      <CrmTabs active={type} />
      <CrmList cfg={cfg} params={await searchParams} action={`/crm/${type}`} />
    </>
  );
}
