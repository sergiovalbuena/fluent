# Fluent — estado del proyecto y plan (handoff)

Última actualización: 2026-10-14. Léelo al empezar una sesión nueva.

## Contexto

- App: Next.js (App Router) + Supabase. Producción: https://fluent-xi.vercel.app
- El dueño (Sergio) estudia **francés** con la app; su mamá va a estudiar **inglés** (habla español).
- Se conversa en **español**.
- Supabase: proyecto `hhllabqyxbmlpewreqdi`. Usar el conector claude.ai Supabase (`mcp__claude_ai_Supabase__*`).
- Vercel: equipo `team_1Z0AjUeLIcfknoUy2sfwLfAg`, proyecto `prj_7lDkaIjj2QyUrVZuecevS4PUBVrA`.
- Ramas: trabajar en `main`; después de cada push también `git push origin main:french-ready`.

## Cómo se trabaja (cosas no obvias)

- **Despliegue manual.** El repo de GitHub no está conectado a Vercel, así que un push no despliega. Desplegar con `mcp__claude_ai_Vercel__create_deployment` (gitSource github, org `sergiovalbuena`, repo `fluent`, ref `main`, sha del commit, target `production`). Si el build falla por Google Fonts (Lexend `module-not-found`), relanzar con `forceNew: "1"`.
- **SQL vía MCP.** `execute_sql` rechaza sentencias que considera destructivas (`DROP`, a veces `DELETE`) con el error "Invalid or expired requestState". Escribir migraciones sin `DROP` cuando son objetos nuevos. `apply_migration` tampoco funciona: usar `execute_sql` y guardar igualmente el archivo en `supabase/migrations/`.
- **Cargar un curso grande.** La extensión `http` está instalada. Hacer push del seed y luego `extensions.http_get(raw.githubusercontent.com/...<sha>...)`, verificar el sha256 y ejecutar con `EXECUTE` dentro de un bloque `DO` (ver el commit 961b995).
- **JSON de contenido.** Nunca poner comillas rectas `"` dentro de los textos. En español usar «», y en inglés `\"` escapadas o comillas tipográficas.
- **Verificar la UI sin login.** Crear una página temporal `src/app/(app)/design-preview/page.tsx` con datos de ejemplo, levantar `npm run dev` (suele quedar en el puerto 3001) y sacar capturas con Chrome headless (`--screenshot`, el ancho mínimo es 500 px) o por CDP (`--remote-debugging-port`). Borrar la página antes de hacer commit.
- `CLAUDE.md` está en `.gitignore` (solo es local).

## Qué está hecho

**Contenido**
- Curso de **francés**: 60 lecciones en `content/fr/` (adaptadas de audios propios, con historias originales). Pendientes de revisión anotados en `content/fr/REVIEW.md`.
- Curso de **inglés**: 60 lecciones en `content/en/`, originales, inglés estadounidense con traducción al español. La protagonista es Carmen (de Guadalajara, se muda a San Diego). Cargado en la base de datos: 60 módulos y 360 lecciones.
- Scripts:
  - `scripts/validate-course.mjs <lang>`: valida el contenido.
  - `scripts/generate-course-sql.mjs <lang>`: genera el SQL. El de francés debe salir idéntico al actual.
- Seeds: `supabase/seed/20261013_french_course.sql` y `supabase/seed/20261014_english_course.sql`.

**App**
- Multilenguaje:
  - Selector de idioma del curso.
  - Ajuste "Traducciones en" en el perfil.
  - Interfaz en 7 idiomas (`messages/*.json`).
- Onboarding:
  - Traducido; el idioma nativo define el idioma de la app y el de las traducciones.
  - No resetea XP, racha ni nombre.
  - Los usuarios sin idioma activo son redirigidos a él.
- `/learn`:
  - Mapa estilo videojuego por unidades ("mundos"), definidas en `src/lib/course-units.ts`.
  - Niveles en 3D, tooltip en los niveles bloqueados y desbloqueo anticipado con gemas.
- Página de lección:
  - Pestañas arriba en la tarjeta principal.
  - Gramática y consejos en la página de Vocab.
  - Práctica seguida (continúa donde te quedaste) en Vocabulario, Frases y Q&A, lanzada desde la tarjeta naranja del hero (Empezar / Continuar / Repasar todo).
  - Prueba A/B para ver todas las palabras: tarjeta "All words" (Dialog con zoom) y "Word sheet" (ruta `/learn/[slug]/words`). Pendiente: elegir una y borrar la otra (comparten `src/components/lesson/word-sheet.tsx`).
  - El vocabulario solo cuenta como completado al dominar todas las palabras.
- Economía de gemas (en el servidor):
  - Tablas `gem_transactions`, `user_boosts` y `user_unlocked_modules`.
  - Funciones `award_gems` (topes de 10 por llamada y 150 al día) y `buy_item`.
  - Trigger `protect_gem_balance`: el cliente no puede escribir `total_gems`.
  - Precios: 2× XP 20, 2× gemas 25, protector de racha 30, desbloquear lección 40.
  - Página `/gems` rediseñada: saldo, cómo ganar, tienda, historial y consejo del día.
- Guardados → **Enlaces de estudio**:
  - Tabla `study_links`.
  - `/api/link-preview` obtiene título y miniatura por oEmbed de YouTube/TikTok.
  - Reproductor de YouTube, TikTok e Instagram dentro de la app.
- **MarIA flotante** en todo el layout (`src/components/maria/maria-widget.tsx`, con shadcn Message y MessageScroller). Usa como contexto la lección abierta. `/api/maria` exige sesión iniciada.
- **Voz con IA:** `/api/tts` (OpenAI `gpt-4o-mini-tts` con instrucciones de acento nativo), con caché en el bucket público `tts`. `speak()` en `src/lib/languages.ts` usa la voz del navegador como respaldo.
- Auth: Google OAuth configurado; las URLs de Supabase Auth están configuradas.
- Lint: 0 errores.

## Pendiente (en orden sugerido)

1. **Añadir en Vercel** (Settings → Environment Variables → Production): `OPENAI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Luego redesplegar. Sin ellas, MarIA y la voz con IA no funcionan (se usa la voz del navegador). En `.env.local` también están vacías.
2. **Conectar el repo de GitHub en Vercel** (Settings → Git) para que los push desplieguen solos. Funciona en el plan gratuito.
3. Probar con una cuenta real: la voz con IA, MarIA, guardar un enlace, comprar en la tienda de gemas y el onboarding de la mamá (nativo Español → aprender Inglés).
4. **Pregenerar el audio** (dejado para más adelante): `scripts/pregenerate-tts.mts`. Uso: `npx tsx scripts/pregenerate-tts.mts en --dry-run` y luego sin `--dry-run`. Necesita las claves del punto 1. Coste aproximado: inglés 2.024 audios ≈ $1.60; francés 3.219 ≈ $3. El bucket `tts` ya existe en Supabase: es público, está vacío y no tiene políticas en `storage.objects`, a propósito (comprobado el 2026-10-15). No hay que añadir ninguna.
5. Revisión de contenido del francés (`content/fr/REVIEW.md`, dejada para el final):
   - Variante del español.
   - Listas de vocabulario largas.
   - "Pensée du jour".
   - Cómo presentar los módulos reemplazados.
6. Opcional:
   - Frases: la tarjeta azul "Practice – Flip & review" y el botón "Start practice" de la lista abren el modo tarjetas, no la práctica del hero; renombrar o quitar.
   - Quitar la extensión `http` si ya no se usa.
   - Qwen3-TTS: descartado por ahora; da más carga que ventaja (ver la conversación del 2026-10-14).

## Notas de diseño

- Color único para las gemas: sky (`#0ea5e9`). Color primario: `#ff8052`. Fuente: Lexend (el usuario no quiere fuentes display tipo Fraunces).
- El usuario prefiere probar visualmente y que se le explique en español qué cambió. Confirmar antes de acciones con coste o que cambian la economía o la configuración.
