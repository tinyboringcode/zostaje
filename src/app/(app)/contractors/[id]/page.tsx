export const dynamic = "force-dynamic";
import { ContractorDetail } from "@/components/contractors/ContractorDetail";

export default function ContractorPage({ params }: { params: { id: string } }) {
  return <ContractorDetail id={params.id} />;
}
