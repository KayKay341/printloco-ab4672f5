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

interface PrintReceiptProps {
  amountFormatted: string
  material: string
  colorName?: string
  quantity: number
  weightG?: number
  makerName: string
  printerLabel?: string
  pickupCode: string
  orderId: string
}

const PrintOrderReceiptEmail = ({
  amountFormatted,
  material,
  colorName,
  quantity,
  weightG,
  makerName,
  printerLabel,
  pickupCode,
  orderId,
}: PrintReceiptProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {SITE_NAME} print order is confirmed ({amountFormatted})</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks for your order</Heading>
          <Text style={lead}>
            Your print is queued with <strong>{makerName}</strong>
            {printerLabel ? ` on ${printerLabel}` : ''}. They&rsquo;ll start the
            job soon and message you when it&rsquo;s ready for pickup.
          </Text>

          <Section style={cardBox}>
            <Text style={cardLabel}>Pickup code</Text>
            <Text style={cardCode}>{pickupCode}</Text>
            <Text style={muted}>Show this to the maker on pickup.</Text>
          </Section>

          <Section style={summary}>
            <Text style={row}><strong>Material:</strong> {material}{colorName ? ` · ${colorName}` : ''}</Text>
            <Text style={row}><strong>Quantity:</strong> {quantity}</Text>
            {weightG && weightG > 0 ? (
              <Text style={row}><strong>Estimated weight:</strong> {weightG.toFixed(1)} g</Text>
            ) : null}
            <Text style={row}><strong>Total:</strong> {amountFormatted}</Text>
            <Text style={mutedSmall}>Order #{orderId.slice(0, 8)}</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PrintOrderReceiptEmail,
  subject: (d: Record<string, any>) =>
    `Your ${SITE_NAME} print order is confirmed (${d.amountFormatted ?? ''})`.trim(),
  displayName: 'Print order receipt',
  previewData: {
    amountFormatted: '$24.50',
    material: 'PLA',
    colorName: 'Matte Black',
    quantity: 1,
    weightG: 132.4,
    makerName: 'Sam from Maker Lab',
    printerLabel: 'Bambu X1 Carbon',
    pickupCode: 'AB12-CD34',
    orderId: '0123456789abcdef',
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
const cardCode = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '24px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#152a44',
  margin: '4px 0 8px',
}
const muted = { fontSize: '12px', color: '#8a93a3', margin: '4px 0 0' }
const mutedSmall = { fontSize: '11px', color: '#a0a8b6', margin: '12px 0 0' }
const summary = { padding: '8px 0', margin: '8px 0 16px' }
const row = { fontSize: '14px', color: '#3d4a5c', lineHeight: '1.7', margin: '0' }
const hr = { borderColor: '#e8e2d6', borderWidth: '1px 0 0 0', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8a93a3', margin: '12px 0 0' }
