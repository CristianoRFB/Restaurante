import { CustomerDetailView } from '@/components/admin-modules';
export default function CustomerDetailPage({ params }: { params: { id: string } }) { return <CustomerDetailView id={params.id} />; }
