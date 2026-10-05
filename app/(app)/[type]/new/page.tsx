import { notFound } from "next/navigation";
import { bySlug } from "@/lib/schema";
import { saveRecord } from "@/app/actions";
import { RecordForm } from "@/components";

export default async function New({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const cfg = bySlug(type);
  if (!cfg) notFound();
  return (<><h1>Add {cfg.singular.toLowerCase()}</h1><RecordForm cfg={cfg} action={saveRecord.bind(null, type, null)} /></>);
}
