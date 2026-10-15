import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function IntroDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="pocs" id={(await params).id} />;
}
