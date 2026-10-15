import { bySlug } from "@/lib/schema";
import { RecordList, ListParams } from "@/ui/record-list";
import { guard } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function Alumni({ searchParams }: { searchParams: Promise<ListParams> }) {
  await guard("alumni");
  return <RecordList cfg={bySlug("alumni")!} params={await searchParams} action="/alumni" />;
}
