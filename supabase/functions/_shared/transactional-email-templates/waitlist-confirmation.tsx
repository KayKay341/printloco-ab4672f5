import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PrintLoco'
const SITE_URL = 'https://printloco.shop'

interface WaitlistConfirmationProps {
  name?: string
  city?: string
  role?: string
  referralCode?: string
}

const WaitlistConfirmationEmail = ({
  name,
  city,
  role,
  referralCode,
}: WaitlistConfirmationProps) => {
  const greeting = name ? `Welcome, ${name}!` : "You're on the list!"
  const cityLine = city
    ? `We'll let you know the moment ${city} goes live.`
    : "We'll let you know the moment your city goes live."
  const referralUrl = referralCode
    ? `${SITE_URL}/waitlist?ref=${referralCode}`
    : null

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You're on the {SITE_NAME} waitlist — here's what's next</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
          </Section>

          <Heading style={h1}>{greeting}</Heading>

          <Text style={lead}>
            Thanks for joining the {SITE_NAME} waitlist. We're building the
            local 3D printing network — neighbors printing for neighbors,
            faster and cheaper than shipping plastic across the country.
          </Text>

          <Text style={text}>{cityLine}</Text>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>How it works</Heading>
          <Text style={step}>
            <strong>1. Upload</strong> — Drop in an STL and we'll instantly
            quote it.
          </Text>
          <Text style={step}>
            <strong>2. Match</strong> — We route your job to a vetted local
            maker with the right printer and material.
          </Text>
          <Text style={step}>
            <strong>3. Pickup</strong> — Grab it in person or have it dropped
            off, usually same-week.
          </Text>

          {role === 'maker' && (
            <>
              <Hr style={hr} />
              <Text style={text}>
                Since you signed up as a maker, we'll reach out personally
                when your area opens up so you can start taking jobs from
                day one.
              </Text>
            </>
          )}

          {referralUrl && (
            <>
              <Hr style={hr} />
              <Heading as="h2" style={h2}>Skip the line</Heading>
              <Text style={text}>
                Every friend who joins with your link bumps you up the
                waitlist and gets your city closer to launch.
              </Text>
              <Section style={{ textAlign: 'center', margin: '24px 0' }}>
                <Button style={button} href={referralUrl}>
                  Share your referral link
                </Button>
              </Section>
              <Text style={small}>
                Or copy:&nbsp;
                <Link href={referralUrl} style={link}>
                  {referralUrl}
                </Link>
              </Text>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            — The {SITE_NAME} team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WaitlistConfirmationEmail,
  subject: "You're on the PrintLoco waitlist",
  displayName: 'Waitlist confirmation',
  previewData: {
    name: 'Jordan',
    city: 'Santa Monica',
    role: 'customer',
    referralCode: 'a1b2c3d4',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  margin: 0,
  padding: 0,
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
}
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
const lead = {
  fontSize: '16px',
  color: '#3d4a5c',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#3d4a5c',
  lineHeight: '1.6',
  margin: '0 0 12px',
}
const step = {
  fontSize: '15px',
  color: '#3d4a5c',
  lineHeight: '1.6',
  margin: '0 0 8px',
}
const small = {
  fontSize: '13px',
  color: '#6b7585',
  lineHeight: '1.5',
  margin: '8px 0 0',
  textAlign: 'center' as const,
  wordBreak: 'break-all' as const,
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
const link = { color: '#2E75B6', textDecoration: 'underline' }
const hr = {
  borderColor: '#e8e2d6',
  borderWidth: '1px 0 0 0',
  margin: '28px 0',
}
const footer = {
  fontSize: '13px',
  color: '#8a93a3',
  margin: '12px 0 0',
}
