# Turning on hearts, "I made this" and notes

The site works without this, but hearts (the upvote), "I made this", the
"Notes & memories" on each recipe and the guestbook on the About page,
including the photos people share there, need a small free database. They use
**Firebase** (a Google service).

- **Cost:** free. The free "Spark" plan can't bill you. It allows about 50,000
  reads and 20,000 writes a day, far more than a family site needs. Its 1 GiB
  of storage holds a few thousand shared photos, and it allows about 40,000
  photo views a month. If the site ever goes past a limit, nothing is charged;
  hearts, notes and photos just pause until the limit resets.
- **Visitors don't need an account.** Firebase gives each browser an anonymous
  ID, which is how "one heart per person" works. To post a note, people just
  type their name.
- **Time needed:** about 15 minutes.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and sign in with your Google
   account.
2. Click **Create a project** (or **Add project**). Name it something like
   `moms-recipes`. Google Analytics isn't needed, so you can switch it off.
3. On the project's home page, click the **Web** button (`</>`) to add a web
   app. Name it "Cookbook website". Skip Firebase Hosting, because GitHub Pages
   hosts the site.
4. Firebase shows a block of code with a `firebaseConfig` object. Keep that tab
   open; you need four values from it in step 5: `apiKey`, `authDomain`,
   `projectId` and `appId`.

## 2. Turn on sign-in

1. In the left menu open **Build → Authentication** and click **Get started**.
2. On the **Sign-in method** tab, enable:
   - **Anonymous**, used for visitors' hearts and notes.
   - **Google**, used only by you to moderate. Pick your email as the support
     email.
3. Open the **Settings** tab, then **Authorized domains**, and add
   `reisgadam.github.io`.

## 3. Create the database and its rules

1. Open **Build → Firestore Database** and click **Create database**. Choose a
   location near your family (for example `nam5 (United States)`) and start in
   **production mode**.
2. Open the **Rules** tab, replace everything there with the contents of
   [`firestore.rules`](../firestore.rules) from this repository, and click
   **Publish**. These rules are what stop anyone from faking hearts or posting
   junk.
3. Open the **Indexes** tab and add a **composite index**:
   - Collection ID: `comments`
   - Fields: `threadId` Ascending, `status` Ascending, `createdAt` Descending
   - Query scope: Collection

   It takes a few minutes to build.

> If you're comfortable with the command line, steps 3.2 and 3.3 are one
> command: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR-PROJECT-ID`

> **Set this up before photos were added (September 2026)?** Photos need the
> newer rules. Repeat step 3.2 with the latest `firestore.rules`. Until then,
> notes without a photo still post, but notes with one don't.

## 4. Tell GitHub about the project

These values identify your Firebase project. They aren't passwords, since the
rules protect the data, so they go in as ordinary **variables**.

1. In the GitHub repository, open **Settings → Secrets and variables →
   Actions**, then the **Variables** tab.
2. Add four **repository variables**, copying the values from step 1.4:

   | Name | Value |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | the `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | the `authDomain` (e.g. `moms-recipes.firebaseapp.com`) |
   | `VITE_FIREBASE_PROJECT_ID` | the `projectId` |
   | `VITE_FIREBASE_APP_ID` | the `appId` |

3. Open the **Actions** tab, choose **Deploy to GitHub Pages**, and click **Run
   workflow**, or just push to `main`. When it finishes, the hearts and notes
   appear on the site.

## 5. Make yourself the moderator

1. Visit <https://reisgadam.github.io/Cookbook/admin>. The site doesn't link
   to this page anywhere.
2. Click **Sign in with Google** and choose your account. The page says you're
   not an admin yet and shows a long ID with a **Copy** button.
3. In the Firebase console, open **Firestore Database → Data**, click **Start
   collection**, and name it `admins`. For the **Document ID**, paste your ID.
   Add any field (for example `name` = your name) and save.
4. Reload the admin page. You'll see every note, newest first, with **Hide**
   (keeps it but takes it off the site) and **Delete**. Photos appear with
   their notes, and hiding or deleting a note does the same to its photo.

You can add other family members as moderators the same way.

## Recommended extras

- **Lock the API key to your site.** In the [Google Cloud
  console](https://console.cloud.google.com/apis/credentials) for the same
  project, open the key named "Browser key (auto created by Firebase)". Under
  **Application restrictions** choose **Websites** and add
  `https://reisgadam.github.io/*` and `http://localhost:5173/*`.
- **Bot protection (App Check).** Notes already have a hidden bot trap and a
  30-second limit between posts. If spam ever becomes a problem:
  1. Create a reCAPTCHA v3 key at <https://www.google.com/recaptcha/admin> for
     the domain `reisgadam.github.io`.
  2. In Firebase, open **App Check** and register the web app with that key's
     secret.
  3. Add a GitHub variable `VITE_FIREBASE_APPCHECK_SITE_KEY` with the site key,
     then redeploy.
  4. After a day of traffic shows up in App Check, click **Enforce** for Cloud
     Firestore.

## What gets stored

- **Hearts and "I made this":** the recipe and the browser's anonymous ID, so
  a person can take their heart back later.
- **Notes:** the name and message people type, the time, and the browser's
  anonymous ID, so they can delete their own note. Nothing else is collected;
  there are no emails, no tracking and no analytics.
- **Photos shared with notes:** before a photo leaves the visitor's phone or
  computer, it's shrunk to at most 1280 pixels across (usually 150–350 KB).
  That also strips the hidden details phones save in photos, including where
  they were taken. Photos are kept in the same database as the notes, because
  Firebase's separate file storage now needs a paid plan.

## Testing locally (optional, for developers)

- **Against the real project:** create `.env.local` in the repository with the
  same four `VITE_FIREBASE_*` lines (format `NAME=value`), then run
  `npm run dev`.
- **Against a throwaway local database:** Java 11 or newer is required. In one
  terminal run `npm run emulators`. Then create `.env.local` with:

  ```
  VITE_FIREBASE_EMULATORS=true
  VITE_FIREBASE_PROJECT_ID=demo-cookbook
  ```

  and run `npm run dev`.
- **Rules tests:** `npm run test:rules` runs the security-rule tests against
  the emulator.
