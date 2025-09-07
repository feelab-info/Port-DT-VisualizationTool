'use client';
import dynamic from 'next/dynamic';

const MapVisualization = dynamic(() => import('./Map'), {
  ssr: false
});

export default function ClientMap() {
  return <MapVisualization />;
}