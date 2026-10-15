import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function ResourceDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="resources" id={(await params).id} />;
}
