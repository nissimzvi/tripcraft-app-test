// TripCraft V109 - public client configuration.
// Public client values only. NEVER put service_role/API secrets here.
window.TRIPCRAFT_CONFIG = {
  // Permanent public URL used for saved Trip IDs, even when the demo is opened from a local ZIP.
  publicAppUrl: 'https://nissimzvi.github.io/tripcraft-app-test/',

  // Supabase project already created for TripCraft:
  supabaseUrl: 'https://zhxmmpctqqoxjconovyv.supabase.co',
  // Paste the Supabase Publishable key (or legacy anon key) here before testing real email OTP.
  supabaseAnonKey: 'sb_publishable_FQAN7Em12GRjR3bYJVlQZw_nMBKgU4z',

  // Secure server-side AI function. The OpenAI key belongs only in the
  // Supabase function secret OPENAI_API_KEY; never place it in this file.
  aiFunctionName: 'tripcraft-ai',

  // CJ Publisher Tag for Booking links. These are public tracking identifiers,
  // not passwords or API secrets. The matching tag is loaded by index.html.
  cjPublisherTagEnabled: true,
  cjPublisherId: '101885723',
  cjSid: 'tripcraft_booking',

  // Booking/CJ affiliate-ready. Every Booking button in V109 passes through this configuration.
  // If Booking supplies a direct affiliate ID, enter it here. It is added as the `aid` query parameter.
  bookingAffiliateId: '',

  // Leave empty until Booking.com MEA/CJ supplies the approved deep-link template.
  // When CJ provides a deep-link template, paste it here using {url} for the encoded Booking destination URL
  // and optionally {destination} for the destination text. Until then TripCraft opens Booking normally.
  bookingAffiliateTemplate: ''
};
