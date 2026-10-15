import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function DealDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="deals" id={(await params).id} />;
}
