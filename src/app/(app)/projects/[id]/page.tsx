import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient projectId={params.id} />;
}
