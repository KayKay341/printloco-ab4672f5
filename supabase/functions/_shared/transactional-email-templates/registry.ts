/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as waitlistConfirmation } from './waitlist-confirmation.tsx'
import { template as giftCardDelivery } from './gift-card-delivery.tsx'
import { template as giftCardReceipt } from './gift-card-purchase-receipt.tsx'
import { template as printOrderReceipt } from './print-order-receipt.tsx'
import { template as makerNewOrder } from './maker-new-order.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'waitlist-confirmation': waitlistConfirmation,
  'gift-card-delivery': giftCardDelivery,
  'gift-card-purchase-receipt': giftCardReceipt,
  'print-order-receipt': printOrderReceipt,
  'maker-new-order': makerNewOrder,
}
