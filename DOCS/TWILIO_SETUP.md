# PrintLoco Twilio Verification Setup

Use this packet when Twilio asks how PrintLoco collects consent, what messages are sent, and how users opt out.

## Brand and site
- **Brand:** PrintLoco
- **Website:** https://printloco.shop
- **Use case:** transactional marketplace notifications for makers and customers, plus optional marketing only when separately selected.

## Message types
PrintLoco sends messages only to users who enter their phone number and check the SMS/email consent box.

### Transactional notifications
- Order received or accepted
- Project status changes
- Maker/customer messages
- Payout or review status updates
- Pickup readiness updates

### Optional marketing
- Product updates, promotions, and PrintLoco tips
- Only sent if the optional marketing checkbox is selected

## Consent language shown in the app
PrintLoco shows this checkbox before review submission:

> Yes, please reach out to me with notifications about my project status (new orders, messages, payouts) by SMS and email at the number and email above. Message & data rates may apply. Reply STOP to opt out anytime.

Optional marketing is collected with a separate checkbox:

> Optional: send me PrintLoco tips, promotions, and product updates.

## Sample messages for Twilio
1. `PrintLoco: Your project was accepted by a local maker. Reply STOP to opt out.`
2. `PrintLoco: Your print is ready for pickup. Check your dashboard for pickup details. Reply STOP to opt out.`
3. `PrintLoco: Your maker application is under review. We'll update you when it changes. Reply STOP to opt out.`
4. `PrintLoco: New order request received. Open your dashboard to review it. Reply STOP to opt out.`
5. `PrintLoco: Your payout setup needs one more verification step. Reply STOP to opt out.`

## STOP / HELP handling
- **STOP:** user is unsubscribed from SMS notifications.
- **HELP:** respond with support instructions and the PrintLoco website.
- Every recurring message should include `Reply STOP to opt out.`

## Twilio Console checklist
1. Create or select a Twilio Messaging Service.
2. Register the PrintLoco brand/campaign using the website and sample messages above.
3. Enable SMS Pumping Protection.
4. Review Geo Permissions and only enable countries you actually serve.
5. Keep Account SID, Auth Token/API Key, phone number, and Messaging Service SID in secure backend secrets only.
6. Do not put Twilio credentials in frontend code.

## Evidence to keep for verification
For each opt-in, keep:
- User ID
- Full name
- Phone number
- Consent text shown at the time
- Whether transactional notifications were accepted
- Whether marketing was accepted
- Timestamp
- Browser user agent

The current app captures this proof at maker review submission so it can be exported for Twilio verification evidence.
