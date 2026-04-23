import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
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
const SITE_URL = 'https://printloco.shop'

interface GiftCardDeliveryProps {
  recipientName?: string
  senderName?: string
  amountFormatted: string
  code: string
  personalMessage?: string
}

const GiftCardDeliveryEmail = ({
  recipientName,
  senderName,
  amountFormatted,
  code,
  personalMessage,
}: GiftCardDeliveryProps) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  const fromLine = senderName
    ? `${senderName} sent you a ${SITE_NAME} gift card.`
    : `Someone sent you a ${SITE_NAME} gift card.`

  const redeemUrl = `${SITE_URL}/gift-cards/redeem?code=${encodeURIComponent(code)}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You received a {amountFormatted} {SITE_NAME} gift card</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
          </Section>

          <Heading style={h1}>You got a gift card 🎁</Heading>

          <Text style={lead}>{greeting}</Text>
          <Text style={lead}>{fromLine}</Text>

          <Section style={cardBox}>
            <Text style={cardLabel}>Gift card value</Text>
            <Text style={cardAmount}>{amountFormatted}</Text>
            <Text style={cardLabel}>Redemption code</Text>
            <Text style={cardCode}>{code}</Text>
          </Section>

          {personalMessage && (
            <>
              <Hr style={hr} />
              <Heading as="h2" style={h2}>A note for you</Heading>
              <Text style={quote}>"{personalMessage}"</Text>
            </>
          )}

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={redeemUrl}>
              Redeem your gift card
            </Button>
          </Section>

          <Text style={small}>
            Or sign in at {SITE_URL}/gift-cards/redeem and paste the code above.
            The balance is added to your account and applied automatically at
            checkout on your next print.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GiftCardDeliveryEmail,
  subject: (d: Record<string, any>) =>
    `${d.senderName ? d.senderName + ' sent you' : 'You received'} a ${d.amountFormatted ?? ''} ${SITE_NAME} gift card`.trim(),
  displayName: 'Gift card delivery',
  previewData: {
    recipientName: 'Alex',
    senderName: 'Jordan',
    amountFormatted: '$50.00',
    code: 'PL-AB12-CD34-EF56',
    personalMessage: 'Happy birthday — go print something cool!',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const header = { marginBottom: '24px' }
const brand = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: '20px',
  fontWeight: 700,
  color: '#1f3a5f',
  letterSpacing: '-0.02em',
  margin: 0,
}
const h1 = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: '30px',
  fontWeight: 700,
  color: '#152a44',
  letterSpacing: '-0.02em',
  margin: '0 0 16px',
}
const h2 = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: '20px',
  fontWeight: 600,
  color: '#152a44',
  margin: '24px 0 12px',
}
const lead = { fontSize: '16px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 12px' }
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
  fontSize: '40px',
  fontWeight: 700,
  color: '#152a44',
  margin: '4px 0 16px',
}
const cardCode = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '20px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  color: '#152a44',
  margin: '4px 0 8px',
}
const quote = {
  fontSize: '15px',
  color: '#3d4a5c',
  fontStyle: 'italic' as const,
  borderLeft: '3px solid #FF8C42',
  padding: '4px 14px',
  margin: '0 0 12px',
  lineHeight: '1.6',
}
const button = {
  backgroundColor: '#FF8C42',
  color: '#152a44',
  fontWeight: 600,
  padding: '14px 28px',
  borderRadius: '12px',
  textDecoration: 'none',
  display: 'inline-block',
  fontSize: '15px',
}
const small = { fontSize: '13px', color: '#6b7585', lineHeight: '1.6', margin: '8px 0 0' }
const hr = { borderColor: '#e8e2d6', borderWidth: '1px 0 0 0', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8a93a3', margin: '12px 0 0' }
