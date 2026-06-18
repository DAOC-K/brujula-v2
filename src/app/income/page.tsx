import { PlaceholderPage } from "@/components/finance/placeholder-page";

export default async function IncomePage() {
  return (
    <PlaceholderPage
      active="income"
      kicker="Planificación de entradas"
      title="Ingresos esperados"
      description="Aquí planearemos salarios, ingresos recurrentes, ingresos únicos y entradas temporales. Al marcar un ingreso como recibido, nacerá un movimiento real."
    />
  );
}
