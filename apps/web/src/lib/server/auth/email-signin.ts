import { getAuth, getOTP } from './index'
import { mintMagicLinkUrl } from './magic-link-mint'
import { config } from '@/lib/server/config'
import { logger } from '@/lib/server/logger'

const log = logger.child({ component: 'auth-email-signin' })

/**
 * Sends a passwordless sign-in email containing both a magic-link button
 * and a 6-digit code. Either path consumes a verification record on the
 * server, so the user picks whichever fits their context (desktop click,
 * cross-device code entry, link-eaten-by-Outlook fallback).
 */
export async function requestEmailSignin(opts: {
  email: string
  /** Path the user lands on after a successful magic-link click. */
  callbackURL: string
  /** Raw Accept-Language header from the sign-in request, if available. */
  acceptLanguage?: string | null
}): Promise<void> {
  const auth = await getAuth()
  const headers = new Headers({
    Origin: config.baseUrl,
    Host: new URL(config.baseUrl).host,
  })

  const { db } = await import('@/lib/server/db')
  const { isEmailConfigured, sendMagicLinkEmail } = await import('@quackback/email')
  const { getEmailSafeUrl } = await import('@/lib/server/storage/s3')
  const { resolveLocale } = await import('@/lib/shared/i18n')

  // Only English and German have a translated magic-link email (see
  // packages/email/src/templates/magic-link.tsx); anything else the portal
  // itself supports still falls back to English for this one template.
  const resolved = resolveLocale(opts.acceptLanguage)
  const locale = resolved === 'de' ? 'de' : 'en'

  // Failed verifies (token consumed by an email scanner, expired, etc.)
  // need to land on the right login page. Admin callbacks (`/admin/...`)
  // bounce to the unified login with a `/admin` callback so it renders
  // the team break-glass form and can request a replacement link. Better-
  // Auth merges its `error` param onto this URL via `URL.searchParams`,
  // so the existing `?callbackUrl=` query survives (joined with `&`).
  // Portal callbacks fall back to /auth/login (the public login screen).
  const errorCallbackPath = opts.callbackURL.startsWith('/admin')
    ? '/auth/login?callbackUrl=/admin'
    : '/auth/login'

  const [{ url: signInUrl }, , settings] = await Promise.all([
    mintMagicLinkUrl({
      email: opts.email,
      callbackPath: opts.callbackURL,
      errorCallbackPath,
      portalUrl: config.baseUrl,
    }),
    auth.api.sendVerificationOTP({
      body: { email: opts.email, type: 'sign-in' },
      headers,
    }),
    db.query.settings.findFirst({ columns: { logoKey: true } }),
  ])

  const otp = getOTP(opts.email)
  if (!otp) throw new Error('OTP was not captured')

  if (!isEmailConfigured()) {
    log.warn('sign-in email not sent: email transport is not configured')
    return
  }

  await sendMagicLinkEmail({
    to: opts.email,
    signInUrl,
    code: otp,
    logoUrl: getEmailSafeUrl(settings?.logoKey) ?? undefined,
    locale,
  })
}
