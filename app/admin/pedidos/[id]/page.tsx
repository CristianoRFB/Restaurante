import { OrderDetailView } from '@/components/order-admin';
export default function AdminOrderDetailPage({ params }: { params: { id: string } }) { return <OrderDetailView id={params.id} />; }
