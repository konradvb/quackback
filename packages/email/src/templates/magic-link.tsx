import { Button, Heading, Hr, Section, Text } from '@react-email/components'
import { EmailLayout, TransactionalFooter } from './email-layout'
import { typography, button, utils } from './shared-styles'

/** Locales with a translated magic-link email. Anything else falls back to English. */
export type MagicLinkLocale = 'en' | 'de'

interface MagicLinkEmailProps {
  signInUrl: string
  code: string
  logoUrl?: string
  locale?: MagicLinkLocale
}

const strings = {
  en: {
    preview: 'Your sign-in link',
    heading: 'Sign in to Quackback',
    intro: 'Click the button below to finish signing in.',
    button: 'Sign in',
    orCode: 'Or enter this code on the sign-in screen:',
    expiry: 'The link and code expire in 10 minutes.',
    footer: "If you didn't request this, you can safely ignore this email.",
  },
  de: {
    preview: 'Dein Anmeldelink',
    heading: 'Bei Quackback anmelden',
    intro: 'Klicke auf den Button unten, um die Anmeldung abzuschließen.',
    button: 'Anmelden',
    orCode: 'Oder gib diesen Code auf dem Anmeldebildschirm ein:',
    expiry: 'Der Link und der Code laufen in 10 Minuten ab.',
    footer: 'Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.',
  },
} as const satisfies Record<MagicLinkLocale, Record<string, string>>

/**
 * Sign-in email containing both a one-click magic link and a 6-digit code.
 *
 * The link is the lower-friction path on desktop; the code is the
 * cross-device fallback (start on desktop, open email on phone — type
 * the code on the device that started the flow). Either consumes the
 * verification record on the server, so the user can pick whichever is
 * convenient.
 */
export function MagicLinkEmail({ signInUrl, code, logoUrl, locale = 'en' }: MagicLinkEmailProps) {
  const t = strings[locale] ?? strings.en

  return (
    <EmailLayout preview={t.preview} logoUrl={logoUrl}>
      <Heading style={{ ...typography.h1, textAlign: 'center' }}>{t.heading}</Heading>
      <Text style={{ ...typography.text, textAlign: 'center' }}>{t.intro}</Text>

      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={signInUrl}>
          {t.button}
        </Button>
      </Section>

      <Hr style={{ margin: '32px 0', borderColor: '#e5e7eb' }} />

      <Text style={{ ...typography.text, textAlign: 'center' }}>{t.orCode}</Text>

      <Section style={utils.codeBox}>
        <Text style={utils.code}>{code}</Text>
      </Section>

      <Text style={{ ...typography.textSmall, textAlign: 'center' }}>{t.expiry}</Text>

      <TransactionalFooter>{t.footer}</TransactionalFooter>
    </EmailLayout>
  )
}
