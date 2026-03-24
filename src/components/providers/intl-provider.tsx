'use client'

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'

interface Props {
  locale: string
  messages: AbstractIntlMessages
  children: React.ReactNode
}

export function IntlProvider({ locale, messages, children }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
