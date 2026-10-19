# Starts & Sutra — Shakuntla Malik

Official website for **Shakuntla Malik — Astrology Consulting & Academy**, based in Faridabad and serving clients worldwide. The site positions astrology as a counselling practice: quiet, considered guidance through Jyotish — not spectacle.

## Website Sections

| Section                  | What it offers                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Hero**                 | Introduction to the practice — Jyotish, Counseling, Guidance — with direct actions to book a consultation or explore the practice. |
| **The Practice**         | The philosophy behind the work: astrology as a counselling discipline rooted in listening and practical guidance.                  |
| **Practice Pillars**     | The three foundations of the practice at a glance.                                                                                 |
| **Services**             | The paid consultations with live pricing (see below).                                                                              |
| **Consultation Journey** | A four-step walkthrough of what working together looks like, from booking to follow-up.                                            |
| **About**                | Shakuntla Malik's background, credentials and approach.                                                                            |
| **Academy**              | The Astrology Academy — learning programs for students of Jyotish.                                                                 |
| **Booking**              | A dedicated consultation booking flow with the client's details and request.                                                       |
| **Footer**               | Contact details, practice location and navigation.                                                                                 |

## Services & Pricing

All amounts are in **INR (₹)**.

| Service                    | Price   | Format                       |
| -------------------------- | ------- | ---------------------------- |
| Single Kundli Consultation | ₹2,100  | 60-minute one-on-one reading |
| Home Vastu                 | ₹50,000 | Full property review         |
| Match Making               | ₹2,100  | Compatibility review         |

Additional guidance and remedies are discussed within consultations; academy program fees are shared on enquiry.

## Booking a Consultation

Visitors can request a consultation directly from the website:

1. Choose a service from the **Services** section or go to **Book a Consultation**.
2. Submit the booking form with their details and preferred service.
3. The request is stored securely and reviewed by the practice.

## Admin Panel

A private, unlisted administration area manages the site's day-to-day operations.

- **Admin URL:** `/admin`
- **Sign-in URL:** `/admin/login`
- Sign-in is via **Google sign-in only** — no email/password form.
- Access is restricted: a Google account can sign in only if it has been approved as an admin for the practice.
- The admin area is never linked from the public site and is excluded from search engines.
- From the admin panel the practice can review and manage consultation bookings, enquiries and site content.

## Design & Experience

- **Midnight & Brass** visual language — deep celestial tones with warm brass and ivory accents.
- Libre Baskerville for display headings, IBM Plex Sans for body text.
- Cinematic editorial layout with generous whitespace and restrained, purposeful motion.
- Fully responsive across desktop and mobile.
- Accessibility: keyboard-visible focus states, semantic structure, and reduced-motion support for visitors who prefer it.

## Practical Notes

- The site respects your privacy preferences: ambient animation is automatically reduced if your device requests it.
- For enquiries not covered by the booking form, reach out through the contact details in the footer.
# Admin remedy dictation, PDFs, and email

The consultation editor includes Hindi (`hi-IN`) dictation, editable Hindi and
English remedies, a print-ready branded preview, and an email flow that attaches
a server-generated PDF with embedded Noto Sans fonts for Devanagari and Latin.
The English draft uses the Gemini API and requires review before sending.

Configure the Functions secrets and sender before deploying:

```sh
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set RESEND_API_KEY
```

Set `REMEDY_EMAIL_FROM` as a Firebase Functions parameter to an address on a
domain verified with Resend (the deploy prompt requests it if it is unset), then
deploy with `firebase deploy --only functions`. The browser preview opens the
print dialog; choose “Save as PDF” to download it. Email attachments are rendered
by the Cloud Function and do not depend on the browser's installed fonts.
