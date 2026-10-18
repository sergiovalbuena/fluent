# Fluent — estado del proyecto y plan (handoff)

Última actualización: 2026-10-17. Léelo al empezar una sesión nueva.

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
  - `scripts/generate-verbs.mjs`: genera `src/data/verbs/<lang>-index.json` y `<lang>-forms.json` para la página `/verbs` (verbos del vocabulario del curso más una lista de esenciales, conjugados con las librerías de RosaeNLG, que son dependencias de desarrollo). Ejecutarlo al añadir o cambiar lecciones. Por ahora cubre francés e inglés. También genera `<lang>-examples.json`: un ejemplo por tiempo verbal (frase real del curso en los tiempos simples cuando existe; si no, plantilla con marcador temporal de `scripts/verb-examples.mjs`), traducido al inglés con `english-verbs-helper` y al español con `scripts/spanish-conjugator.mjs` (conjugador propio: la librería `spanish-verbs` daba formas erróneas). Los verbos de estado en inglés (be, have, know…) no tienen ejemplo en los tiempos continuos.
  - `scripts/generate-lesson-titles.mjs`: regenera `src/lib/lesson-titles.ts` (título de cada lección en cada idioma). Ejecutarlo al añadir o cambiar lecciones. La descripción de la lección se muestra en el idioma nativo del usuario a partir de esa tabla (`src/lib/lesson-description.ts`). `modules.description` en la base de datos solo tiene el español y ya solo se usa para cursos antiguos sin archivos de contenido.
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
  - "Ver todo" en Frases, Q&A e Historia: el mismo Dialog (`src/components/lesson/all-items-dialog.tsx`) con zoom y "Escuchar todo" (lee cada elemento con 1,5 s de pausa).
  - Títulos de las secciones en el idioma que se aprende, con tooltip de traducción: **desplegado el 2026-10-16, pendiente de revisión** (ver la sección "Revisión pendiente" al final).
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
- **Seguridad de rutas** (2026-10-17): `src/proxy.ts` llama a `updateSession`, que redirige a `/login` todo lo que no está en `publicRoutes` (`src/lib/supabase/middleware.ts`). Antes de esto, todas las rutas de `(app)` eran accesibles sin sesión en producción. Verificado en producción con curl (307 a login).
- **Páginas legales** en el grupo `(legal)` (sin sidebar, públicas): `/privacy-policy` y `/terms`, con el componente común `src/components/legal/legal-document.tsx`. El footer de la landing y el perfil enlazan a ambas.
- **Página de lección `/learn/[slug]`:** bento "Bonus" con tres grupos: Repaso (Gramática y Consejos en Dialog, Word sheet, Flashcards; sin recompensas porque son solo información), Práctica (Arrange y Translate con estrellas y gemas; "Práctica de gramática" como Próximamente) y Minijuegos. Solo las tarjetas de acción muestran recompensas.
- **Verbos `/verbs`** (en el sidebar y la barra inferior, en lugar de MarIA): todos los verbos del curso, buscador, filtro Esenciales, y Dialog con todas las conjugaciones por modo, audio y un ejemplo por tiempo (botón "Ejemplo" junto a cada título de tiempo). Datos en `src/data/verbs/` (ver el script `generate-verbs.mjs`).
- **Reto de verbos `/verbs/practice`** (también en `/mini-games` y en el Dialog de cada verbo con `?verb=`): rondas de 10, modo Elegir (4 opciones con distractores del mismo verbo) o Escribir (con botones de acentos; un acento mal cuenta como "casi"). Los fallos vuelven al final de la ronda. Recompensas como los demás minijuegos (5/10/15 XP según acierto + 3 gemas, `reason: 'minigame'`); repasar fallos no da recompensas. Lógica en `src/lib/verb-quiz.ts`, UI en `src/components/verbs/verb-practice.tsx`. Los ajustes se recuerdan en `localStorage` (`fluent:verb-game:<idioma>`).
- **Sidebar (2026-10-17):** la fila del perfil abre un menú (`src/components/layout/account-menu.tsx`): Perfil, Progreso, Gemas con saldo y Cerrar sesión. Mientras está abierto, el sidebar no se colapsa (`hold` en `src/components/ui/sidebar.tsx`). Se quitaron del sidebar Gemas, Progreso, Videos y el botón de tema (sigue en la barra superior).
- **`/videos` desactivada:** redirige a `/dashboard` desde `next.config.ts`; la página sigue en el repo.
- **Minijuegos `/mini-games`** (antes `/play`; `/play/*` redirige con 308): bento de tamaños variados con animación propia en cada tarjeta al pasar el ratón (`src/components/mini-games/mini-games-content.tsx`). Muestra gemas ganadas jugando y partidas de hoy a partir de `gem_transactions` (`reason = 'minigame'`). Los juegos en sí siguen en inglés.
- **Idiomas en los minijuegos (2026-10-17):** el contenido va en el idioma del curso y la interfaz en el idioma de la app (espacio de nombres `games` en `messages/*.json`; títulos y descripciones en `mini_games`). Hora de música usa canciones tradicionales de dominio público por idioma (`src/data/songs.ts`; antes eran letras con derechos de autor y solo en español). Historia corta usa las historias de las lecciones y genera preguntas completando sus frases con las expresiones destacadas. Se quitaron las palabras de reserva en español y las palabras vacías de Completa la frase son por idioma. Cursos sin datos de canciones (de, it, pt, ja) no pueden jugar Hora de música. Video corto y Tres en raya se eliminaron (2026-10-17); sus rutas redirigen a `/mini-games`.
- **Fuente de práctica de los minijuegos** (`src/lib/practice-source.ts`, selector en `src/components/mini-games/source-picker.tsx`): "Todas mis lecciones" o una o varias lecciones, solo entre las que el usuario puede abrir (mismo criterio que el mapa de `/learn`). Se elige en `/mini-games` o en la pantalla de inicio de cada juego y se guarda en `localStorage` por curso (`fluent:practice-source:<idioma>`). La usan los 10 juegos con palabras (Tarjetas también usa frases cortas; Completa la frase usa frases). Hora de música, Historia corta y Video corto siguen con contenido fijo en el código. Pendiente: fuente por tema de gramática (aparece como "Pronto").
- **Entrenador de vocabulario `/mini-games/vocabulary`** (`src/components/mini-games/vocab-trainer.tsx`): cada palabra pasa por conocer → reconocer (4 opciones) → escuchar → escribir, en bloques de 4. Los fallos vuelven al final. Sesiones de 6, 10 o 15 palabras. Recompensas de minijuego; no marca palabras como dominadas en las lecciones (decisión del usuario).
- **`/progress` rediseñado:** recorrido del curso por unidades, racha con la semana, XP, palabras dominadas reales (`user_vocab_mastery`), gemas, precisión, mapa de actividad de 26 semanas (`user_activity`), habilidades por tipo de actividad, logros con avance y actividad reciente. Solo cuenta el curso activo.
- **Página de lección:** el bonus es un bento de tamaños variados (gramática grande con adelanto, consejos con el primer consejo, animaciones en ordenar, traducir, tarjetas y hoja de palabras). Sin minijuegos, a petición del usuario.
- **Guardados:** "Enlaces de estudio" es la pestaña por defecto. Cada tarjeta tiene un menú ⋯ (ver, abrir en la plataforma, copiar enlace, editar título/categoría/nota, eliminar con "Deshacer").
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
   - Frases (`/learn/[slug]/phrases`, p. ej. `/learn/lecon-01/phrases`): la tarjeta azul "Practice / Flip & review" (a la derecha de la lista de frases) y el botón "Start practice" al pie de esa lista abren el modo tarjetas (voltear y repasar, sin guardar progreso), no la práctica seguida de la tarjeta naranja del hero. Hay dos cosas llamadas "práctica" que hacen cosas distintas. Propuesta: renombrar la azul a "Tarjetas" y quitar el botón del pie.
   - Quitar la extensión `http` si ya no se usa.
   - Qwen3-TTS: descartado por ahora; da más carga que ventaja (ver la conversación del 2026-10-14).

7. **Confirmar el email de contacto legal.** `LEGAL_CONTACT` en `src/components/legal/legal-document.tsx` es `privacy@fluent.app`, que no es un buzón real. Cambiarlo por uno que funcione antes de abrir la app al público. Se quitó la dirección postal inventada que había en la política de privacidad.
8. **Footer: preguntas abiertas.** Qué es "Claim" y qué debe hacer la página "printer" (con "coming soon" en el navbar). No se crearon hasta tener respuesta.
9. **Traducir las descripciones de lección a de, it, pt y ja.** `src/lib/lesson-titles.ts` solo tiene en, es y fr; con otro idioma nativo se muestra el inglés.
10. **Bento de la lección.** Las etiquetas de grupo (Repaso, Práctica, Minijuegos) están en el idioma de la interfaz; decidir si van en el idioma del curso como las tarjetas principales. Diseñar la actividad "Práctica de gramática".
11. **Prueba A/B de "ver todas las palabras"**: elegir entre el Dialog y la ruta `/words` y borrar la otra.
12. **Probar en el navegador** `/verbs`, `/verbs/practice` y `/terms` (no se pudieron revisar visualmente: la extensión de Chrome no estaba conectada). Revisar también en móvil.

## Notas de diseño

- Color único para las gemas: sky (`#0ea5e9`). Color primario: `#ff8052`. Fuente: Lexend (el usuario no quiere fuentes display tipo Fraunces).
- El usuario prefiere probar visualmente y que se le explique en español qué cambió. Confirmar antes de acciones con coste o que cambian la economía o la configuración.

## Revisión pendiente (2026-10-16): títulos traducidos + tooltip + "ver todo"

Con commit y desplegado en producción el 2026-10-16 a petición del usuario, pero **pendiente de revisión**.

**Qué se pidió**
- "Ver todo" (Dialog con zoom) también en Frases, Q&A e Historia, y un botón para escuchar todos los elementos seguidos con 1,5 s de pausa.
- Títulos de las secciones de la lección traducidos, con un tooltip que muestra la traducción en el idioma nativo del usuario. Solo en títulos y secciones importantes, no dentro de las actividades. Solo escritorio (hover sobre la tarjeta, sin cambiar el cursor).
- Opción en el perfil para activar o desactivar el tooltip y elegir hasta qué lección se muestra (por defecto, hasta la lección 3).

**Qué se hizo (archivos)**
- `src/lib/section-titles.ts`: diccionario de títulos en 7 idiomas. Los títulos se muestran en el idioma del curso.
- `src/components/lesson/title-hint.tsx`: `SectionTitle`, `TitleHintProvider` y `HINT_AREA`. El tooltip se abre al pasar el cursor por la zona marcada con `HINT_AREA` (tarjeta, pestaña o cabecera). En pantallas táctiles no aparece. Tampoco aparece cuando el título y la traducción son iguales (p. ej. "Phrases" en francés con nativo inglés). Es intencionado, confirmado por el usuario.
- `src/lib/title-hints.ts`: la opción se guarda en `localStorage` (clave `fluent:title-hints`). Por defecto está activada hasta la lección 3. "Lección N" sale de `modules.order_index`.
- `src/components/lesson/all-items-dialog.tsx`: Dialog reutilizable con zoom y "Escuchar todo".
- `src/components/lesson/word-sheet.tsx`: resalta el elemento que se está leyendo.
- `src/app/(app)/learn/[slug]/[activity]/page.tsx`: títulos con `SectionTitle`, pestañas del hero unificadas en `activityTabs()`, tarjetas `AllItemsCard` y Dialogs en las 4 secciones.
- `src/app/(app)/profile/page.tsx`: fila "Traducción de títulos" en Aprendizaje.
- `messages/*.json`: textos nuevos (`lesson.ov_*`, `lesson.listen_*`, `profile.title_hints*`).

**Decisiones abiertas**
- **Límite de lecciones.** El usuario mencionó dejarlo **fijo hasta la lección 5**, sin opción en el perfil. Ahora es configurable, con 3 por defecto. Decidir: fijo en 5 (quitar la fila del perfil y `title-hints.ts`) o configurable con 5 por defecto.
- **Interpretación de "traducir los títulos".** Se interpretó como mostrar los títulos en el idioma del curso, con el tooltip en el idioma nativo. Confirmar con el usuario.

**Base de datos (producción): limpieza pendiente**
- Se añadieron sin preguntar dos columnas a `user_profiles`: `title_hints_enabled` y `title_hints_until_lesson`. El código ya no las usa, y el archivo de migración se borró del repo.
- **Siguen existiendo en producción.** Quitarlas desde el SQL Editor de Supabase, solo con el visto bueno del usuario:
  ```sql
  alter table public.user_profiles
    drop column if exists title_hints_enabled,
    drop column if exists title_hints_until_lesson;
  ```

**Cómo probar**
- Servidor local: `npx next dev -p 3333` (el puerto 3000 lo usa otro proyecto). Para entrar con Google en localhost hay que añadir `http://localhost:3333/**` a las Redirect URLs de Supabase Auth.
- `/learn/lecon-01/vocabulary`: tooltips en los títulos, "Tous les mots" con zoom y "Escuchar todo".
- `/learn/lecon-04/vocabulary`: sin tooltips.
- Perfil → Aprendizaje → "Traducción de títulos".
- Verificado: `tsc` sin errores y ESLint sin errores nuevos. **No se probó en el navegador.**
