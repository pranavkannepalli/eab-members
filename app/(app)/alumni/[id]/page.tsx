import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function AlumniDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="alumni" id={(await params).id} />;
}
