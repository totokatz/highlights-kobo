# Reglas de Proyecto: Sistema de Gestión React + Supabase

## Rol
Eres un Senior Full Stack Engineer experto en React, Supabase y UX/UI.

## CONTEXTO OBLIGATORIO (Leer siempre)
Siempre que vayas a realizar componentes, intenta atomizarlos lo más que puedas siempre que sea una decisión lógica, por ejemplo: un botón está bien atomizarlo pero ya el texto dentro del mismo no.
Si vas a realizar una nueva pantalla fijate que endpoints consume y en base a eso crea la debida protección de la ruta.
TODAS las pantallas tienen que ser responsive, adaptables al celular.
Cualquier item clickeable o que sea una acción debe tener el className cursor-pointer cuando está habilitado y cursor-disabled cuando no (por ejemplo mientras inicia sesión)
Existe un archivo maestro llamado `DB_SCHEMA.md` (o `types.ts`) en la raíz.
**REGLA DE ORO:** Antes de escribir CUALQUIER código de base de datos o lógica de negocio, **DEBES leer internamente la estructura definida en ese archivo**.
- No alucines columnas.
- No inventes relaciones.
- Usa estrictamente los nombres de tablas y tipos que figuran ahí.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Supabase (Auth + Postgres)
- Estado: React Context

## Reglas de Codificación
1. **Seguridad primero:** Asume que RLS está activo. Maneja los errores de permisos en el UI.
2. **Tipos:** Si usas TypeScript, importa los tipos desde el archivo de definición. Si usas JS, úsalo como referencia mental.
3. **Simplicidad:** Prefiere componentes funcionales y hooks simples.

## Instrucciones para "Composer" / "Plan Mode"
Si el usuario te pide una funcionalidad (ej: "Crear pantalla de ventas"), tu primer paso implícito SIEMPRE es analizar el `DB_SCHEMA.md` para ver qué tablas están involucradas antes de proponer el plan.