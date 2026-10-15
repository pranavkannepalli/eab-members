import { bySlug } from "@/lib/schema";
import { RecordList, ListParams } from "@/ui/record-list";
import { guard } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function Intros({ searchParams }: { searchParams: Promise<ListParams> }) {
  await guard("pocs");
  return <RecordList cfg={bySlug("pocs")!} params={await searchParams} action="/intros" />;
}
