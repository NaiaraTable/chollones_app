-- INSTRUCCIONES PARA ARREGLAR EL PROBLEMA DE BORRADO
-- Copia y pega el siguiente código en el "SQL Editor" de tu proyecto en Supabase:

-- Opción 1: Desactivar seguridad (Más fácil para desarrollo)
ALTER TABLE guardados DISABLE ROW LEVEL SECURITY;

-- Opción 2: O si prefieres mantener seguridad, ejecuta esto para permitir borrar a usuarios anónimos:
-- CREATE POLICY "Enable delete for anon" ON "public"."guardados" AS PERMISSIVE FOR DELETE TO public USING (true);
