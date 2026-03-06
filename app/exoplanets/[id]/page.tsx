import ExoplanetDetailsClient from "./ui";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ExoplanetDetailsClient id={resolvedParams.id} />;
}
