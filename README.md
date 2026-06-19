# Brújula V2

Brújula V2 es una aplicación web de finanzas personales enfocada en control mensual, organización de pagos, ingresos esperados y movimientos reales.

URL de producción de prueba: https://brujula-v2.vercel.app

Estado actual: MVP funcional en producción de prueba.

Versión estable: prod-test-v1

## Objetivo

Brújula ayuda a responder:

- Cuánto dinero tengo disponible este mes.
- Qué pagos tengo pendientes.
- Qué ingresos espero recibir.
- Qué movimientos reales ya ocurrieron.
- Si el mes está sano o necesita ajuste.
- Qué debería revisar antes de gastar más.

## Módulos principales

### Dashboard

Centro de control financiero mensual.

Muestra disponible estimado, ingresos reales, ingresos esperados, gastos reales, agenda pendiente, salud financiera y recomendaciones básicas.

### Movimientos

Libro real de dinero.

Aquí viven los movimientos que ya ocurrieron: ingresos reales, gastos reales, gastos manuales y movimientos creados desde Agenda o Ingresos esperados.

Los gastos manuales pueden editarse y eliminarse desde Movimientos. Los movimientos creados desde Agenda o Ingresos se controlan desde su módulo de origen.

### Agenda de pagos

Planificación de pagos.

Permite crear pagos únicos, recurrentes y temporales. Al marcar un pago como pagado, Brújula crea automáticamente un movimiento real tipo gasto.

### Ingresos esperados

Planificación de ingresos.

Permite crear ingresos únicos, recurrentes y temporales. Al marcar un ingreso como recibido, Brújula crea automáticamente un movimiento real tipo ingreso.

### Asistente IA

Asistente financiero inicial basado en reglas internas.

Analiza disponible estimado, pagos pendientes, gastos reales, ingresos reales, ingresos esperados y riesgos básicos del periodo.

### Configuración

Permite administrar nombre del espacio financiero, presupuesto mensual base y moneda principal.

## Arquitectura financiera

Movimientos = realidad financiera.

Agenda de pagos = planificación de egresos.

Ingresos esperados = planificación de ingresos.

Reglas centrales:

- Pago marcado como pagado crea movimiento real tipo expense.
- Ingreso marcado como recibido crea movimiento real tipo income.
- Dashboard calcula con movimientos reales, pagos pendientes e ingresos esperados.
- El presupuesto mensual solo se usa como respaldo si no existen ingresos reales ni ingresos esperados.

## Fórmula base

Disponible estimado = ingresos reales + ingresos esperados pendientes + presupuesto mensual de respaldo - gastos reales - pagos pendientes.

El presupuesto mensual solo entra si el periodo no tiene ingresos reales ni ingresos esperados.

## Stack técnico

- Next.js 16
- App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase RLS
- Vercel

## Variables de entorno

Variables necesarias:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

En local van en .env.local.

En producción van en Vercel Environment Variables.

## Correr local

Instalar dependencias:

npm install

Ejecutar local:

npm run dev

Abrir:

http://localhost:3000

Compilar:

npm run build

## Supabase Auth

Configuración usada:

Site URL:

https://brujula-v2.vercel.app/

Redirect URLs:

https://brujula-v2.vercel.app/**

http://localhost:3000/**

## Producción

Repositorio:

https://github.com/DAOC-K/brujula-v2

Deploy:

https://brujula-v2.vercel.app

## Validado en producción

- Login.
- Logout.
- Dashboard.
- Movimientos.
- Agenda de pagos.
- Ingresos esperados.
- Asistente IA.
- Configuración.
- Crear ingreso esperado.
- Marcar ingreso como recibido.
- Crear movimiento desde ingreso.
- Crear pago.
- Marcar pago como pagado.
- Crear movimiento desde pago.
- Crear gasto manual.
- Editar gasto manual.
- Eliminar gasto manual.
- Limpiar datos QA.

## Próximas prioridades

- QA multiusuario.
- Revisión de RLS.
- Mejorar estados vacíos.
- Mejorar onboarding.
- Exportar reportes.
- Mejorar asistente financiero.
- Preparar beta cerrada.

## Licencia

Proyecto privado en desarrollo.
