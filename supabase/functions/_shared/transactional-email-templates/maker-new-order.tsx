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

interface MakerNewOrderProps {
  payoutFormatted: string
  totalFormatted: string
  material: string
  colorName?: string
  quantity: number
  weightG?: number
  customerName?: string
  printerLabel?: string
  pickupCode: string
  orderId: string
  notes?: string
  dashboardUrl?: string
}

const MakerNewOrderEmail = ({
  payoutFormatted,
  totalFormatted,
  material,
  colorName,
  quantity,
  weightG,
  customerName,
  printerLabel,
  pickupCode,
  orderId,
  notes,
  dashboardUrl,
}: MakerNewOrderProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New print job · {payoutFormatted} payout</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You have a new print job</Heading>
          <Text style={lead}>
            {customerName ? `${customerName} just paid` : 'A customer just paid'}
            {printerLabel ? ` for a print on your ${printerLabel}` : ''}. Your
            payout for this order is <strong>{payoutFormatted}</strong>.
          </Text>

          <Section style={cardBox}>
            <Text style={cardLabel}>Pickup code</Text>
            <Text style={cardCode}>{pickupCode}</Text>
            <Text style={muted}>Customer will show this on pickup.</Text>
          </Section>

          <Section style={summary}>
            <Text style={row}><strong>Material:</strong> {material}{colorName ? ` · ${colorName}` : ''}</Text>
            <Text style={row}><strong>Quantity:</strong> {quantity}</Text>
            {weightG && weightG > 0 ? (
              <Text style={row}><strong>Estimated weight:</strong> {weightG.toFixed(1)} g</Text>
            ) : null}
            <Text style={row}><strong>Order total:</strong> {totalFormatted}</Text>
            <Text style={row}><strong>Your payout:</strong> {payoutFormatted}</Text>
            {notes ? (
              <Text style={row}><strong>Notes:</strong> {notes}</Text>
            ) : null}
            <Text style={mutedSmall}>Order #{orderId.slice(0, 8)}</Text>
          </Section>

          {dashboardUrl ? (
            <Text style={text}>
              Open your dashboard to download the file and start printing:&nbsp;
              <a href={dashboardUrl} style={link}>{dashboardUrl}</a>
            </Text>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MakerNewOrderEmail,
  subject: (d: Record<string, any>) =>
    `New print job · ${d.payoutFormatted ?? ''} payout`.trim(),
  displayName: 'Maker · new order notification',
  previewData: {
    payoutFormatted: '$22.05',
    totalFormatted: '$24.50',
    material: 'PLA',
    colorName: 'Matte Black',
    quantity: 1,
    weightG: 132.4,
    customerName: 'Alex',
    printerLabel: 'Bambu X1 Carbon',
    pickupCode: 'AB12-CD34',
    orderId: '0123456789abcdef',
    notes: 'Please pack carefully — fragile.',
    dashboardUrl: 'https://printloco.shop/dashboard',
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
const text = { fontSize: '14px', color: '#3d4a5c', lineHeight: '1.6', margin: '0 0 12px' }
const cardBox = {
  background: 'linear-gradient(135deg, #eef6ff 0%, #d8eaff 100%)',
  border: '1px solid #b6d4f5',
  borderRadius: '20px',
  padding: '24px',
  margin: '20px 0',
  textAlign: 'center' as const,
}
const cardLabel = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  color: '#3a6ea5',
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
const link = { color: '#1d6fd1', textDecoration: 'underline' }
const hr = { borderColor: '#e8e2d6', borderWidth: '1px 0 0 0', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#8a93a3', margin: '12px 0 0' }
