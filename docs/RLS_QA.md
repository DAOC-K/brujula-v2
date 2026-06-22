# QA Multiusuario y RLS - Brújula V2

Fecha de validación: 2026-06-21

Estado: aprobado

Tag estable:

rls-multiuser-v1

## Objetivo

Validar que Brújula separa correctamente los datos financieros entre usuarios diferentes.

## Cuentas usadas

Cuenta principal:

daoc1997@gmail.com

Cuenta de prueba:

daoc1997+brujulaqa@gmail.com

## Pruebas realizadas

Con la cuenta de prueba se crearon datos RLS:

- RLS ingreso
- RLS pago usuario 2
- RLS pago manual

Luego se validó que esos datos aparecieran únicamente en la cuenta de prueba.

Después se inició sesión con la cuenta principal y se validó que esos registros no aparecieran en:

- Dashboard
- Movimientos
- Ingresos esperados
- Agenda de pagos

## Auditoría SQL

La auditoría confirmó que los registros RLS pertenecían al correo:

daoc1997+brujulaqa@gmail.com

Y estaban asociados a un space_id diferente al de la cuenta principal.

## Limpieza

Los datos RLS fueron eliminados de:

- movements
- income_plans
- payment_plans

Validación final:

- movements: 0 registros RLS
- income_plans: 0 registros RLS
- payment_plans: 0 registros RLS

## Resultado

QA multiusuario aprobado.

Aislamiento visual aprobado.

Auditoría SQL aprobada.

Limpieza de datos de prueba aprobada.

## Veredicto

Brújula V2 pasó la primera validación seria de aislamiento de datos entre usuarios.
