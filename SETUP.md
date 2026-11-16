# Turning on the live database

Until this is done, the platform saves changes in each person's own browser only.
After it is done, every change reaches everyone straight away, showing who made it and when.

## 1. Create the database (about 5 minutes)

1. Go to supabase.com and sign up for free.
2. Create a new project. Name it `jfm-platform`, choose a strong database password, and pick the London region if it is offered.
3. Wait for the project to finish setting up.

## 2. Create the table

1. In the project, open **SQL Editor** and choose **New query**.
2. Paste everything from `supabase/setup.sql` and press **Run**.
3. This also creates the store for site inspection photos and videos. Without it, photos and videos stay on the device that took them.

## 3. Connect the site

1. In Supabase, open **Project Settings**, then **API**.
2. Copy the **Project URL** and the **anon public** key.
3. On GitHub, open `config.js`, tap the pencil to edit, and paste them between the quotes:

```js
window.JFM_LIVE = {
  url: 'https://xxxx.supabase.co',
  key: 'eyJ...'
};
```

4. Commit the change. Vercel redeploys on its own within a minute.

## 4. Check it

Open the site, sign in, and look at the yellow bar at the top. It should say **Live.**
Open the site on a second device, update a task on one, and watch it change on the other.

The anon key is designed to be public, so it is fine in `config.js`.

## Before real data goes in

The demo rules let anyone with the site read and change the data. Before real residents or
real figures go in, sign in has to move to the server and the rules have to be locked down
so each person only reaches their own buildings.
