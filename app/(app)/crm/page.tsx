import { bySlug } from "@/lib/schema";
import { CrmTabs, CrmList, ListParams } from "@/ui/crm-list";
export const dynamic = "force-dynamic";

// CRM lands on the Members table; the old dashboard lives at /crm/overview.
export default async function Crm({ searchParams }: { searchParams: Promise<ListParams> }) {
  return (
    <>
      <CrmTabs active="members" />
      <CrmList cfg={bySlug("members")!} params={await searchParams} action="/crm" />
    </>
  );
}
