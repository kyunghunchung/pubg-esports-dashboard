import { EventDetailClient } from './EventDetailClient'

export function generateStaticParams() {
  return []
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  return <EventDetailClient id={params.id} />
}
