# Roadmap MVP comercial - Brújula V2

## Estado actual

Brújula V2 ya tiene:

- Auth.
- Dashboard.
- Movimientos reales.
- Agenda de pagos.
- Ingresos esperados.
- Recurrentes.
- Materialización de pagos e ingresos.
- Asistente financiero inicial.
- Responsive mobile.
- Producción de prueba en Vercel.

## Fase 1 - Endurecimiento técnico

Objetivo: hacer la app confiable para usuarios reales.

Prioridades:

- QA multiusuario.
- Revisión completa de RLS.
- Validación de permisos por espacio financiero.
- Protección contra duplicados.
- Manejo de errores más claro.
- Estados de carga.
- Estados vacíos.
- Validaciones de formularios más robustas.

Resultado esperado:

La app es segura para pruebas con usuarios externos controlados.

## Fase 2 - Experiencia de usuario

Objetivo: que la app sea clara para un usuario nuevo.

Prioridades:

- Mejorar onboarding inicial.
- Crear guía del primer mes financiero.
- Mejorar textos de ayuda.
- Mejorar navegación mobile.
- Mejorar tarjetas resumen.
- Agregar empty states claros.
- Agregar confirmaciones visuales.
- Agregar filtros por categoría.

Resultado esperado:

Un usuario nuevo entiende qué hacer sin explicación externa.

## Fase 3 - Inteligencia financiera

Objetivo: que Brújula ayude a decidir, no solo a registrar.

Prioridades:

- Mejorar Asistente IA v1.
- Detectar gastos variables altos.
- Detectar pagos vencidos.
- Detectar meses negativos.
- Detectar falta de ingresos.
- Sugerir acciones.
- Crear resumen mensual automático.

Resultado esperado:

La app genera recomendaciones útiles con base en los datos del usuario.

## Fase 4 - Reportes y exportación

Objetivo: entregar valor práctico.

Prioridades:

- Reporte mensual.
- Exportar movimientos a CSV.
- Exportar resumen a PDF.
- Reporte por categoría.
- Comparativo entre meses.
- Historial de cierres mensuales.
- Indicadores de salud financiera.

Resultado esperado:

El usuario puede revisar, exportar y compartir su situación financiera.

## Fase 5 - MVP comercial controlado

Objetivo: probar con usuarios reales cercanos.

Prioridades:

- Landing simple.
- Registro claro.
- Política de privacidad.
- Términos de uso.
- Contacto de soporte.
- Cuenta demo.
- Feedback interno.
- Corrección rápida de bugs.
- Beta cerrada.

Resultado esperado:

Brújula puede ser probada por usuarios reales de forma controlada.

## Fase 6 - Monetización

Opciones posibles:

### Plan gratuito

- 1 espacio personal.
- Movimientos básicos.
- Agenda básica.
- Ingresos esperados.
- Dashboard mensual.

### Plan Pro

- Asistente financiero avanzado.
- Reportes.
- Exportaciones.
- Múltiples espacios.
- Historial extendido.
- Recomendaciones personalizadas.

### Plan familiar

- Espacios compartidos.
- Roles.
- Control conjunto.
- Presupuesto compartido.

## No hacer todavía

- Abrir registro público masivo.
- Cobrar sin política de privacidad.
- Conectar IA externa sin revisar privacidad y costos.
- Meter muchas funciones nuevas sin QA.
- Complicar la app con módulos no validados.

## Próxima prioridad recomendada

Endurecimiento técnico + QA multiusuario.

Orden sugerido:

1. Crear segunda cuenta de prueba.
2. Crear datos en ambas cuentas.
3. Confirmar aislamiento total de datos.
4. Revisar RLS.
5. Mejorar estados vacíos.
6. Preparar beta cerrada.
