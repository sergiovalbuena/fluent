'use client'

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'

interface Props {
  locale: string
  messages: AbstractIntlMessages
  /** Needed by next-intl to format dates the same on server and client */
  timeZone?: string
  children: React.ReactNode
}

export function IntlProvider({ locale, messages, timeZone, children }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  )
}
