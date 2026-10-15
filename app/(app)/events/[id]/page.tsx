import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="events" id={(await params).id} />;
}
