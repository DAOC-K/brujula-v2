# Checklist de producción - Brújula V2

Estado: producción de prueba aprobada.

URL: https://brujula-v2.vercel.app

Tag estable: prod-test-v1

## Deploy

- [x] Proyecto desplegado en Vercel.
- [x] Repositorio conectado a GitHub.
- [x] Rama main configurada.
- [x] Build local aprobado.
- [x] Build en Vercel aprobado.
- [x] URL pública activa.
- [x] Variables de entorno configuradas.

## Supabase Auth

- [x] Supabase conectado en producción.
- [x] Site URL configurado.
- [x] Redirect URL de producción configurado.
- [x] Redirect URL local configurado.
- [x] Login probado.
- [x] Logout probado.

## Navegación

- [x] Dashboard abre.
- [x] Movimientos abre.
- [x] Ingresos esperados abre.
- [x] Agenda de pagos abre.
- [x] Asistente IA abre.
- [x] Configuración abre.
- [x] Layout desktop probado.
- [x] Layout mobile probado.

## Operaciones financieras

- [x] Crear ingreso esperado.
- [x] Marcar ingreso como recibido.
- [x] Crear movimiento real desde ingreso.
- [x] Crear pago.
- [x] Marcar pago como pagado.
- [x] Crear movimiento real desde pago.
- [x] Crear gasto manual.
- [x] Editar gasto manual.
- [x] Eliminar gasto manual.
- [x] Recalcular totales después de cambios.

## Limpieza QA

- [x] Crear datos QA.
- [x] Validar datos QA.
- [x] Eliminar datos QA.
- [x] Confirmar 0 registros QA restantes.

## Pendiente antes de producción comercial

### Seguridad

- [ ] Probar dos usuarios diferentes.
- [ ] Confirmar que un usuario no ve datos de otro.
- [ ] Confirmar que un usuario no edita datos de otro.
- [ ] Confirmar que un usuario no borra datos de otro.
- [ ] Revisar políticas RLS tabla por tabla.
- [ ] Revisar funciones security definer.
- [ ] Activar 2FA en Vercel.

### Calidad

- [ ] Probar usuario nuevo sin datos.
- [ ] Probar sesión expirada.
- [ ] Probar doble clic en marcar pagado.
- [ ] Probar doble clic en marcar recibido.
- [ ] Probar celular real.
- [ ] Probar Chrome, Safari y Firefox.

### Producto

- [ ] Mejorar onboarding.
- [ ] Mejorar estados vacíos.
- [ ] Agregar ayuda contextual.
- [ ] Crear landing comercial.
- [ ] Crear política de privacidad.
- [ ] Crear términos de uso.

## Veredicto

Brújula V2 está lista como MVP funcional en producción de prueba.

Todavía no debe considerarse producto comercial abierto hasta completar QA multiusuario, seguridad extendida y documentación legal mínima.
