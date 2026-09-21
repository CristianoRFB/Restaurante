import { EditReservationForm } from '@/components/admin-modules';
export default function EditReservationPage({ params }: { params: { id: string } }) { return <EditReservationForm id={params.id} />; }
