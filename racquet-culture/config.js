/* Racquet Culture live database settings (Supabase).
   Leave url and key empty and the app runs in preview mode: everything stays on each device.
   Fill them in (steps in SETUP.md) and every player shares one set of accounts, profiles and rankings.
   The anon key is designed to be public, so it is fine here. */
window.RC_LIVE = {
  url: '',
  key: '',
  /* Players sign in with a username. Behind the scenes each username becomes a private
     sign-in address at this domain. No email is ever sent to it. Leave it as it is. */
  emailDomain: 'players.racquetculture.app'
};
