// TripCraft V89 - public client configuration.
// Public client values only. NEVER put service_role/API secrets here.
window.TRIPCRAFT_CONFIG = {
  // Supabase project already created for TripCraft:
  supabaseUrl: 'https://zhxmmpctqqoxjconovyv.supabase.co',
  // Paste the Supabase Publishable key (or legacy anon key) here before testing real email OTP.
  supabaseAnonKey: 'sb_publishable_FQAN7Em12GRjR3bYJVlQZw_nMBKgU4z',

  // Booking/CJ affiliate-ready. Leave empty until Booking.com MEA approves the CJ application.
  // When CJ provides a deep-link template, paste it here using {url} for the encoded Booking destination URL
  // and optionally {destination} for the destination text. Until then TripCraft opens Booking normally.
  bookingAffiliateTemplate: ''
};
