import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PrintLoco'

interface ReceiptProps {
  amountFormatted: string
  code: string
  recipientEmail?: string
  deliveryMethod: 'buyer' | 'recipient'
}

const GiftCardReceiptEmail = ({
  amountFormatted,
  code,
  recipientEmail,
  deliveryMethod,
}: ReceiptProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {SITE_NAME} gift card purchase ({amountFormatted})</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks for your gift card purchase</Heading>
          <Text style={lead}>
            Your {amountFormatted} {SITE_NAME} gift card is ready.
          </Text>

          <Section style={cardBox}>
            <Text style={cardLabel}>Amount</Text>
            <Text style={cardAmount}>{amountFormatted}</Text>
            <Text style={cardLabel}>Redemption code</Text>
            <Text style={cardCode}>{code}</Text>
          </Section>

          {deliveryMethod === 'recipient' && recipientEmail ? (
            <Text style={text}>
              We'll email this code to <strong>{recipientEmail}</strong> shortly.
              You're getting this copy as a receipt — keep it safe in case you need
              to resend it.
            </Text>
          ) : (
            <Text style={text}>
              You chose to deliver the code yourself. Forward this email or share
              the code above however you like.
            </Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GiftCardReceiptEmail,
  subject: (d: Record<string, any>) =>
    `Your ${SITE_NAME} gift card purchase (${d.amountFormatted ?? ''})`.trim(),
  displayName: 'Gift card purchase receipt',
  previewData: {
    amountFormatted: '$50.00',
    code: 'PL-AB12-CD34-EF56',
    recipientEmail: 'friend@example.com',
    deliveryMethod: 'recipient',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const h1 = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: '28px',
  fontWeight: 700,
  color: '#152a44',
  margin: '0 0 16px',
}
const lead = { fontSize: '16px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 12px' }
const cardBox = {
  background: 'linear-gradient(135deg, #fff5ec 0%, #ffe8d4 100%)',
  border: '1px solid #ffd0a8',
  borderRadius: '20px',
  padding: '24px',
  margin: '20px 0',
  textAlign: 'center' as const,
}
const cardLabel = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  color: '#9a6b3a',
  textTransform: 'uppercase' as const,
  margin: '4px 0',
}
const cardAmount = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: '36px',
  fontWeight: 700,
  color: '#152a44',
  margin: '4px 0 16px',
}
const cardCode = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  color: '#152a44',
  margin: '4px 0 8px',
}
const hr = { borderColor: '#e8e2d6', borderWidth: '1px 0 0 0', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8a93a3', margin: '12px 0 0' }
