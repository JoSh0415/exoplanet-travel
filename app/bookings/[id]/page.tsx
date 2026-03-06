import BookingDetailPage from "./ui";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <BookingDetailPage id={resolvedParams.id} />;
}
