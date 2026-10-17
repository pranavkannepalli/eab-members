import { RecordDetail } from "@/ui/record-page";
export const dynamic = "force-dynamic";

export default async function FinanceDetail({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetail slug="finance" id={(await params).id} />;
}
