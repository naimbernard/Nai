# Racquet Culture app

A web app for the Racquet Culture community in Goa: accounts, player profiles, a level check for padel and pickleball, score logging and community rankings.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page and all the styling |
| `app.js` | Everything the app does |
| `config.js` | Where the live database details go |
| `setup.sql` | Creates the live database tables (run once in Supabase) |
| `logo.png` | The Racquet Culture logo, white on a transparent background |

## Try it now (preview mode)

Open `index.html` in a browser, or deploy the folder to Vercel. With `config.js` empty, the app runs in **preview mode**:
accounts, profiles and scores are saved in that browser only. Each phone has its own separate club.

To see full rankings straight away, sign up, finish your profile, then go to **Profile → Add demo players**.
This adds 12 made-up players and 40 example games, all marked *Demo*. **Remove demo players** takes them out again.

## Turn on the live database (about 10 minutes)

When this is done, everyone shares one set of accounts, profiles and rankings, and new scores appear for everyone straight away.

### 1. Create the database

1. Go to supabase.com and sign in (the same account as the JFM project is fine).
2. Create a **new project** for Racquet Culture. Pick the Mumbai (South Asia) region if it is offered.
3. Wait for it to finish setting up.

### 2. Let players sign up with a username

Players sign in with a username and password, not an email, so email confirmation must be off.

1. Open **Authentication → Sign In / Providers → Email**.
2. Turn **Confirm email** off and save.

### 3. Create the tables

1. Open **SQL Editor → New query**.
2. Paste everything from `setup.sql` and press **Run**.

### 4. Connect the app

1. Open **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Paste them into `config.js`:

```js
window.RC_LIVE = {
  url: 'https://xxxx.supabase.co',
  key: 'eyJ...',
  emailDomain: 'players.racquetculture.app'
};
```

4. Commit the change. Vercel redeploys on its own.

### 5. Check it

Create an account on one phone and finish the profile. On a second phone, start creating an account with the same username.
It should say **This username is already taken. Try another one.**

## How levels and rankings work

- **Starting level.** During profile set-up each player picks Beginner, Intermediate or Expert, then answers 5 or 6 questions
  based on how clubs and rating guides describe each level. This gives a starting number:
  - Padel: 0.5 to 7.0 (Beginner below 2.5, Intermediate 2.5 to 4.49, Pro 4.5 and up)
  - Pickleball: 1.0 to 6.0 (Beginner below 3.0, Intermediate 3.0 to 3.99, Pro 4.0 and up)
- **Each result moves the level.** Each team's strength is the average of its two players' levels.
  Beating a stronger team earns more; losing to a weaker team costs more. A strong player with a weaker partner is not punished,
  because their team's average is lower, so a win counts for more and a loss costs less.
- **Margin counts a little.** A big win moves levels up to 20% more than a close one.
- **New players settle fast.** For the first 5 games a level moves twice as fast, then 1.4 times as fast until game 15.
- **Players without an account.** Whoever logs the score must enter the level of each guest. Members' levels fill in on their own.
  Only members' levels change.
- **Three rankings per sport.** Beginner, Intermediate and Pro. Players move between them as their level crosses the line.
- **Everyone sees the same numbers.** Levels are worked out by replaying every game in date order, so deleting a mistaken score
  recalculates everything correctly.

## Your own avatars

The 12 pixel avatars are placeholders. To use your own artwork:

1. Put the images in an `avatars` folder next to `index.html`, e.g. `avatars/a1.png` (square images, at least 256 × 256).
2. In `app.js`, find `const AVATARS=` and change entries to point at the files, for example:

```js
const AVATARS=[{id:'px1',src:'avatars/a1.png'},{id:'px2',src:'avatars/a2.png'}, ...];
```

Keep the same `id`s so anyone who already picked an avatar gets the new picture.

## Not built yet

- Sending game invites (players can already say whether they are open to invites, and others can filter for them).
- Confirming scores: right now a score counts as soon as one player logs it. A later version could ask an opponent to confirm.
- Password reset by email (players have no email). For now an admin can reset one in Supabase: find the player's `id` in the `rc_profiles` table, then find the user with the same id under **Authentication → Users** and set a new password.
