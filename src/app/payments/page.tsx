import { PlaceholderPage } from "@/components/finance/placeholder-page";

export default async function PaymentsPage() {
  return (
    <PlaceholderPage
      active="payments"
      kicker="Planificación de salidas"
      title="Agenda de pagos"
      description="Aquí estarán pagos recurrentes, cuotas, gastos únicos y vencimientos. Al confirmar un pago, se creará su movimiento real de gasto."
    />
  );
}
