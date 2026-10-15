import { bySlug } from "@/lib/schema";
import { RecordList, ListParams } from "@/ui/record-list";
import { guard } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function Vcs({ searchParams }: { searchParams: Promise<ListParams> }) {
  await guard("vcs");
  return <RecordList cfg={bySlug("vcs")!} params={await searchParams} action="/vcs" />;
}
