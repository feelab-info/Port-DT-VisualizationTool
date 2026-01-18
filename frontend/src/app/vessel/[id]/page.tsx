// This is a Server Component that will handle the route params
import { VesselDetailPageClient } from './client';

// Server component to handle params properly and pass data to client component
export default async function VesselDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VesselDetailPageClient id={id} />;
} 
