# Twilio & Supabase Phone Authentication Setup

To enable phone OTP verification in your PrintLoco application, you need to configure your Supabase project to use Twilio as the SMS provider.

## 1. Get Twilio Credentials
1.  Sign up or log in to [Twilio Console](https://www.twilio.com/console).
2.  Find your **Account SID** and **Auth Token** on your Dashboard.
3.  Navigate to **Messaging > Services** to create a new Messaging Service.
    *   Once created, note your **Messaging Service SID** (starting with `MG...`).
4.  Ensure you have a verified Twilio phone number that can send SMS.

## 2. Configure Supabase
1.  Open your [Supabase Project Dashboard](https://app.supabase.com/).
2.  Navigate to **Project Settings > Authentication**.
3.  Locate the **Phone** provider section.
4.  Enable the **Phone** provider.
5.  Enter the following credentials you obtained from the Twilio Console:
    *   **Twilio Account SID**
    *   **Twilio Auth Token**
    *   **Twilio Message Service SID**
6.  Save your settings.

Once configured in Supabase, the `supabase.auth.signInWithOtp({ phone: ..., ... })` method will automatically use these settings to send SMS verification codes.
