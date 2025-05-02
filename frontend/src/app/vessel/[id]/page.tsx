// This is a Server Component that will handle the route params
import { VesselDetailPageClient } from './client';

// Server component to handle params properly and pass data to client component
export default function VesselDetailPage({ params }: { params: { id: string } }) {
  return <VesselDetailPageClient id={params.id} />;
} 