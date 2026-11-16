// Privacy policy and terms, in the two languages of the public site. Keep both
// languages in step: every section exists in each, in the same order.

export type LegalLocale = 'en' | 'es'
export type LegalSection = { title: string; content: string }
export type LegalDoc = { title: string; intro: string; updated: string; sections: LegalSection[] }

export const LEGAL_UI: Record<LegalLocale, {
  updated: string
  questions: string
  privacy: string
  terms: string
  backToProfile: string
  backToHome: string
}> = {
  en: {
    updated: 'Last updated:',
    questions: 'Questions? Email us at',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    backToProfile: 'Back to profile',
    backToHome: 'Back to home',
  },
  es: {
    updated: 'Última actualización:',
    questions: '¿Dudas? Escríbenos a',
    privacy: 'Política de privacidad',
    terms: 'Términos del servicio',
    backToProfile: 'Volver al perfil',
    backToHome: 'Volver al inicio',
  },
}

/** How to reach us: the contact address when there is one, and always the in-app way */
const reach = (locale: LegalLocale, contact: string | null) =>
  locale === 'es'
    ? contact ? `Escríbenos a ${contact}.` : 'Escríbenos desde el Centro de ayuda de la app.'
    : contact ? `Write to ${contact}.` : 'Contact us from the Help Center in the app.'

export function privacyPolicy(locale: LegalLocale, contact: string | null): LegalDoc {
  if (locale === 'es') {
    return {
      title: 'Política de privacidad',
      intro: 'Esta política explica, con palabras sencillas, qué datos recoge Fluent, para qué y qué puedes hacer al respecto.',
      updated: '15 de noviembre de 2026',
      sections: [
        {
          title: '1. Qué datos recogemos',
          content: `Solo recogemos lo necesario para que Fluent funcione:

• Datos de la cuenta: tu correo y tu nombre visible. Si entras con Google, recibimos de Google tu nombre, correo y foto de perfil. Nunca vemos tu contraseña de Google.
• Ajustes de aprendizaje: tu idioma nativo, el idioma que aprendes, el idioma de la app, tu motivación, tu nivel estimado, tu meta diaria y la hora del recordatorio.
• Progreso: lecciones y actividades terminadas, notas, estrellas, XP, gemas, rachas, compras hechas con gemas y palabras dominadas.
• Contenido que añades: los enlaces de estudio que guardas y los mensajes que envías a MarIA, la tutora con IA.
• Tu voz, cuando practicas la pronunciación: la grabación (unos segundos) se envía para puntuarla y no la guardamos.
• Grupos de estudio: si te unes a uno, sus miembros ven tu nombre, foto, curso, racha y XP. Nunca ven tu correo.
• Datos técnicos: la información que tu navegador envía en cada petición (como el tipo de navegador y la dirección IP), para mantener el servicio en marcha y seguro, y estadísticas de visitas anónimas y sin cookies.`,
        },
        {
          title: '2. Para qué los usamos',
          content: `Usamos tus datos para:

• Gestionar tu cuenta y mantener tu sesión
• Mostrar tu progreso, dar XP, gemas y estrellas, y llevar tu racha
• Personalizar las lecciones, las traducciones y el idioma de la app
• Responder tus preguntas a MarIA, leer textos en voz alta con voces de IA y puntuar tu pronunciación
• Corregir problemas, evitar abusos y mejorar Fluent

No usamos tus datos para publicidad y no los vendemos.`,
        },
        {
          title: '3. Proveedores',
          content: `Fluent depende de unos pocos proveedores que tratan datos por nuestra cuenta, solo para prestar el servicio:

• Supabase: base de datos, autenticación y almacenamiento de archivos
• Vercel: alojamiento de la app y estadísticas de visitas anónimas (sin cookies)
• Google: inicio de sesión, si eliges «Continuar con Google»
• OpenAI: genera las respuestas de MarIA y el audio de las voces de IA. Los mensajes que envías a MarIA se envían a OpenAI para producir la respuesta. El texto que se lee en voz alta se envía para crear el audio; ese texto es del curso, no de tu cuenta.
• Microsoft Azure (Speech): puntúa tu pronunciación. Cuando usas el micrófono en un ejercicio de pronunciación, la grabación y el texto que debías decir se envían a Microsoft para obtener la puntuación. Fluent no guarda la grabación. El micrófono solo se usa cuando tú pulsas para grabar.
• YouTube, TikTok e Instagram: vistas previas y reproductores de los enlaces de estudio que guardas. Cuando reproduces uno, esa plataforma puede recoger datos según su propia política.
• Sentry: si está activado, recibe informes técnicos de errores (qué falló y en qué página), sin tu correo ni el contenido de tus mensajes.

Algunos de estos proveedores tratan los datos en Estados Unidos.

El audio generado a partir del contenido del curso se guarda en una caché pública para que cargue más rápido. Solo contiene texto del curso, nunca datos personales.`,
        },
        {
          title: '4. Con quién los compartimos',
          content: `No vendemos, alquilamos ni intercambiamos tus datos personales. Aparte de los proveedores anteriores, solo compartimos información si la ley lo exige, para proteger la seguridad y los derechos de nuestros usuarios, o como parte de una fusión o adquisición (en ese caso te avisaremos antes).`,
        },
        {
          title: '5. Cookies y almacenamiento local',
          content: `Usamos las cookies estrictamente necesarias para mantener tu sesión y recordar el idioma del sitio. Tu navegador también guarda en tu dispositivo algunas preferencias (como el tema, los ajustes de los juegos y los borradores). No usamos cookies de publicidad ni de rastreo de terceros.`,
        },
        {
          title: '6. Cuánto tiempo guardamos los datos',
          content: `Guardamos tus datos mientras tu cuenta está activa. Puedes eliminar tu cuenta tú mismo en Perfil → «Eliminar mi cuenta»: tu perfil, progreso, gemas, enlaces guardados y demás datos se borran de inmediato y no se pueden recuperar. Las copias de seguridad y los registros técnicos pueden tardar hasta 30 días en desaparecer, salvo que la ley nos obligue a conservar algo más tiempo.`,
        },
        {
          title: '7. Seguridad',
          content: `Los datos viajan cifrados (HTTPS). El acceso a la base de datos está restringido con seguridad a nivel de fila, de modo que cada usuario solo puede leer y cambiar sus propios datos. Ningún sistema es totalmente seguro, pero trabajamos para proteger tu información y te avisaremos de cualquier brecha que te afecte, como exige la ley.`,
        },
        {
          title: '8. Tus derechos',
          content: `Puedes pedirnos:

• Acceder a una copia de tus datos
• Corregir datos inexactos
• Eliminar tu cuenta y tus datos (también directamente desde tu perfil)
• Exportar tus datos en un formato común
• Oponerte a algún tratamiento o limitarlo

${reach('es', contact)} Respondemos en un máximo de 30 días. Si vives en la UE, el Reino Unido u otra región con leyes de protección de datos, también puedes reclamar ante tu autoridad local.`,
        },
        {
          title: '9. Menores',
          content: `Fluent no está pensado para menores de 13 años (o la edad mínima de tu país). No recogemos sus datos a sabiendas, y los eliminamos si descubrimos que lo hemos hecho.`,
        },
        {
          title: '10. Cambios',
          content: `Si cambiamos esta política de forma importante, te avisaremos en la app antes de que el cambio entre en vigor. La fecha de arriba indica la última versión.`,
        },
      ],
    }
  }

  return {
    title: 'Privacy Policy',
    intro: 'This policy explains, in plain words, what Fluent collects, why, and what you can do about it.',
    updated: 'November 15, 2026',
    sections: [
      {
        title: '1. Information we collect',
        content: `We only collect what we need to run Fluent:

• Account data: your email address and display name. If you sign in with Google, we receive your name, email and profile picture from Google. We never see your Google password.
• Learning settings: your native language, the language you are learning, the language of the app, your motivation, your estimated level, daily goal and reminder time.
• Progress: lessons and activities completed, scores, stars, XP, gems, streaks, purchases made with gems, and words you have mastered.
• Content you add: study links you save and the messages you send to MarIA, the AI tutor.
• Your voice, when you practice pronunciation: the recording (a few seconds) is sent to be scored and we do not keep it.
• Study groups: if you join one, its members see your name, picture, course, streak and XP. They never see your email.
• Technical data: the information your browser sends with each request (such as browser type and IP address), used to keep the service running and secure, and anonymous, cookie-free visit statistics.`,
      },
      {
        title: '2. How we use it',
        content: `We use your information to:

• Run your account and keep you signed in
• Show your progress, award XP, gems and stars, and keep your streak
• Personalize lessons, translations and the language of the app
• Answer your questions to MarIA, read text aloud with AI voices and score your pronunciation
• Fix problems, prevent abuse and improve Fluent

We do not use your data for advertising and we do not sell it.`,
      },
      {
        title: '3. Service providers',
        content: `Fluent relies on a few providers that process data on our behalf, only to provide the service:

• Supabase: database, authentication and file storage
• Vercel: hosting of the app and anonymous visit statistics (no cookies)
• Google: sign-in, if you choose "Continue with Google"
• OpenAI: generates MarIA's answers and AI voice audio. Messages you send to MarIA are sent to OpenAI to produce a reply. Text read aloud is sent to create the audio; that text comes from the course, not from your account.
• Microsoft Azure (Speech): scores your pronunciation. When you use the microphone in a pronunciation exercise, the recording and the text you had to say are sent to Microsoft to get the score. Fluent does not keep the recording. The microphone is only used when you press to record.
• YouTube, TikTok and Instagram: previews and players for study links you save. When you play one, that platform may collect data under its own policy.
• Sentry: when enabled, receives technical error reports (what failed and on which page), without your email or the content of your messages.

Some of these providers process data in the United States.

Audio generated from course content is stored in a public cache so it loads faster. It contains only course text, never personal data.`,
      },
      {
        title: '4. Sharing',
        content: `We do not sell, rent or trade your personal information. Besides the providers above, we only share information if the law requires it, to protect the safety and rights of our users, or as part of a merger or acquisition (in which case we will tell you first).`,
      },
      {
        title: '5. Cookies and local storage',
        content: `We use cookies that are strictly necessary to keep you signed in and to remember the language of the site. Your browser also stores a few preferences on your device (such as the theme, game settings and drafts). We do not use advertising or third-party tracking cookies.`,
      },
      {
        title: '6. How long we keep data',
        content: `We keep your data while your account is active. You can delete your account yourself in Profile → "Delete my account": your profile, progress, gems, saved links and other data are deleted right away and cannot be recovered. Backups and technical logs can take up to 30 days to disappear, unless the law requires us to keep something longer.`,
      },
      {
        title: '7. Security',
        content: `Data is encrypted in transit (HTTPS). Access to the database is restricted with row-level security, so each user can only read and change their own data. No system is completely secure, but we work to protect your information and will notify you of any breach that affects you as required by law.`,
      },
      {
        title: '8. Your rights',
        content: `You can ask us to:

• Access a copy of your data
• Correct inaccurate data
• Delete your account and data (also directly from your profile)
• Export your data in a common format
• Object to or restrict some processing

${reach('en', contact)} We answer within 30 days. If you live in the EU, the UK or another region with data-protection laws, you can also complain to your local authority.`,
      },
      {
        title: '9. Children',
        content: `Fluent is not intended for children under 13 (or the minimum age in your country). We do not knowingly collect their data, and we delete it if we learn that we have.`,
      },
      {
        title: '10. Changes',
        content: `If we change this policy in a meaningful way, we will tell you in the app before the change takes effect. The date at the top shows the latest version.`,
      },
    ],
  }
}

export function termsOfService(locale: LegalLocale, contact: string | null): LegalDoc {
  if (locale === 'es') {
    return {
      title: 'Términos del servicio',
      intro: 'Las reglas para usar Fluent, escritas para que se lean. Al usar Fluent las aceptas.',
      updated: '15 de noviembre de 2026',
      sections: [
        {
          title: '1. Acuerdo',
          content: `Al crear una cuenta o usar Fluent aceptas estos términos y nuestra Política de privacidad. Si no estás de acuerdo, por favor no uses Fluent.`,
        },
        {
          title: '2. Tu cuenta',
          content: `Necesitas una cuenta para usar Fluent. Debes tener al menos 13 años (o la edad mínima de tu país). Da información veraz, cuida tus datos de acceso y avísanos si crees que otra persona está usando tu cuenta. Eres responsable de lo que ocurra en tu cuenta.`,
        },
        {
          title: '3. Uso de Fluent',
          content: `Puedes usar Fluent para tu propio aprendizaje de idiomas. Te comprometes a no:

• Copiar, revender ni redistribuir las lecciones, el audio u otro contenido
• Extraer datos del servicio de forma automática ni acceder con bots
• Intentar romper, sobrecargar o saltarte la seguridad del servicio
• Manipular el XP, las gemas, las rachas u otras recompensas con errores o automatización
• Usar MarIA o cualquier otra función para crear contenido ilegal, dañino o abusivo`,
        },
        {
          title: '4. Gemas, XP y recompensas',
          content: `Las gemas, el XP, las estrellas, las rachas y los potenciadores son recompensas virtuales por aprender. No tienen valor monetario, no se pueden comprar ni cambiar por dinero y no se pueden transferir a otras cuentas. Podemos cambiar cómo se ganan o se gastan, y corregir saldos afectados por errores o abusos.`,
        },
        {
          title: '5. Funciones con IA',
          content: `MarIA (la tutora con IA), las voces de IA y la puntuación de la pronunciación se generan de forma automática. Pueden equivocarse, también en gramática, pronunciación o datos. Úsalas como ayuda para aprender, no como fuente definitiva. Estas funciones tienen límites diarios de uso.`,
        },
        {
          title: '6. Tu contenido',
          content: `Sigues siendo dueño de lo que añades a Fluent, como los enlaces de estudio guardados y los mensajes a MarIA. Nos das permiso para guardarlo y tratarlo solo para prestarte el servicio. No añadas contenido que no tengas derecho a compartir.`,
        },
        {
          title: '7. Nuestro contenido',
          content: `Las lecciones, las historias, el audio, el diseño y el software de Fluent pertenecen a Fluent o a sus licenciantes y están protegidos por la ley. El contenido de plataformas de terceros (como los videos de YouTube que enlazas) pertenece a sus dueños.`,
        },
        {
          title: '8. Disponibilidad y cambios',
          content: `Fluent está en desarrollo activo. Podemos añadir, cambiar o quitar funciones, y el servicio puede no estar disponible en algún momento. Intentaremos avisar de los cambios importantes.`,
        },
        {
          title: '9. Fin de tu cuenta',
          content: `Puedes dejar de usar Fluent y eliminar tu cuenta en cualquier momento desde tu perfil. Podemos suspender o cerrar cuentas que incumplan estos términos de forma grave o repetida.`,
        },
        {
          title: '10. Garantías y responsabilidad',
          content: `Fluent se ofrece «tal cual». No prometemos que esté libre de errores ni que vayas a alcanzar un nivel concreto en un idioma. En la medida en que la ley lo permita, no respondemos de pérdidas indirectas o derivadas, ni de la pérdida de datos, recompensas o progreso. Nada en estos términos limita los derechos irrenunciables que te da la ley de consumo.`,
        },
        {
          title: '11. Cambios en estos términos',
          content: `Podemos actualizar estos términos. Si un cambio es importante, te avisaremos en la app antes de que entre en vigor. Si sigues usando Fluent después, se aplican los términos nuevos.`,
        },
        {
          title: '12. Contacto',
          content: `¿Dudas sobre estos términos? ${reach('es', contact)}`,
        },
      ],
    }
  }

  return {
    title: 'Terms of Service',
    intro: 'The rules for using Fluent, written to be read. By using Fluent you accept them.',
    updated: 'November 15, 2026',
    sections: [
      {
        title: '1. Agreement',
        content: `By creating an account or using Fluent you agree to these terms and to our Privacy Policy. If you do not agree, please do not use Fluent.`,
      },
      {
        title: '2. Your account',
        content: `You need an account to use Fluent. You must be at least 13 years old (or the minimum age in your country). Give accurate information, keep your sign-in details safe and tell us if you think someone else is using your account. You are responsible for what happens in your account.`,
      },
      {
        title: '3. Using Fluent',
        content: `You may use Fluent for your own personal language learning. You agree not to:

• Copy, resell or redistribute the lessons, audio or other content
• Scrape the service or access it with bots
• Try to break, overload or get around the security of the service
• Manipulate XP, gems, streaks or other rewards through bugs or automation
• Use MarIA or any other feature to create illegal, harmful or abusive content`,
      },
      {
        title: '4. Gems, XP and rewards',
        content: `Gems, XP, stars, streaks and boosts are virtual rewards for learning. They have no monetary value, cannot be bought with or exchanged for money, and cannot be transferred to other accounts. We may change how they are earned or spent, and we may correct balances affected by errors or abuse.`,
      },
      {
        title: '5. AI features',
        content: `MarIA (the AI tutor), the AI voices and the pronunciation scores are generated automatically. They can make mistakes, including in grammar, pronunciation or facts. Use them as a learning aid, not as an authoritative source. These features have daily usage limits.`,
      },
      {
        title: '6. Your content',
        content: `You keep ownership of what you add to Fluent, such as saved study links and messages to MarIA. You give us permission to store and process it only to provide the service to you. Do not add content you do not have the right to share.`,
      },
      {
        title: '7. Our content',
        content: `Lessons, stories, audio, design and software in Fluent belong to Fluent or its licensors and are protected by law. Content from third-party platforms (such as YouTube videos you link) belongs to its owners.`,
      },
      {
        title: '8. Availability and changes',
        content: `Fluent is under active development. We may add, change or remove features, and the service may sometimes be unavailable. We will try to give notice of important changes.`,
      },
      {
        title: '9. Ending your account',
        content: `You can stop using Fluent and delete your account at any time from your profile. We may suspend or close accounts that seriously or repeatedly break these terms.`,
      },
      {
        title: '10. Disclaimers and liability',
        content: `Fluent is provided "as is". We do not promise that it will be error-free or that you will reach a particular level in a language. To the extent the law allows, we are not liable for indirect or consequential losses, or for loss of data, rewards or progress. Nothing in these terms limits rights you have under consumer law that cannot be waived.`,
      },
      {
        title: '11. Changes to these terms',
        content: `We may update these terms. If a change is significant, we will tell you in the app before it takes effect. If you keep using Fluent after that, the new terms apply.`,
      },
      {
        title: '12. Contact',
        content: `Questions about these terms? ${reach('en', contact)}`,
      },
    ],
  }
}
