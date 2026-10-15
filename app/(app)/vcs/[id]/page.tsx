import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function VcDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="vcs" id={(await params).id} />;
}
