# AutoLarp
Larping for cars.

## About

Ever wanted to know what it feels like to own a garage full of ridiculously expensive cars? Now you can (sort of).

This app lets you **larp as the owner of luxury cars**. Simply launch the app, create an account, and add your dream cars to your virtual garage. From there, you can pretend that each car has its own dedicated mobile app, just like the ones offered by actual luxury car manufacturers.

The goal is to mimic the experience of owning and managing high-end vehicles through a sleek, personal car app. There's just one catch: **it's all larp.** The app doesn't actually connect to, control, or do anything with real cars. It's purely for the experience.

The live deployment is currently down, but you can still run the application locally by following the setup instructions below.

~ Many thanks to Claude Code and Freebuff!

## LarpHacks 2026 Submission

Built by **Tanish Singh, Zain Aleem, and Emre Gunarslan** as a submission to **LarpHacks 2026**.

The theme for this edition of LarpHacks was:

> Tools to Help You Larp

## Run it

1. Get a MongoDB connection string. The free tier of [MongoDB Atlas](https://www.mongodb.com/atlas) works:
   create a cluster → **Connect** → **Drivers** → copy the `mongodb+srv://...` string
   (replace `<password>` with your database user's password). Under **Network Access**, allow your IP
   (or `0.0.0.0/0` while testing from Codespaces).
2. Install and start:
   ```
   npm install
   npm start
   ```
   The first time, it asks for the connection string and saves it to `.env` (which is git-ignored),
   so you only enter it once. You can also copy `.env.example` to `.env` and fill it in yourself.
3. Open http://localhost:8080 (in Codespaces: the **Ports** tab → port 8080).

Accounts, vehicles and photos are stored in MongoDB (database `autolarp`).

## AI assistant (optional)

The ✦ button on the garage and car pages opens a chat that can run vehicle controls
("lock all my cars", "turn on the climate") and recommend which car to take
("which car fits the most suitcases?"). It uses Google Gemini (`gemini-flash-latest` by default;
set `GEMINI_MODEL` to change it).

Add a Gemini API key (aistudio.google.com/apikey) as `GEMINI_API_KEY` in `.env`
(`npm start` offers to save it the first time) or in Render's Environment settings.
Without a key the site works normally and the chat says the assistant isn't set up.

### Voice replies (optional)

The assistant can read its replies aloud with ElevenLabs (🔊 button in the chat header to mute).
Add `ELEVENLABS_API_KEY` (elevenlabs.io → Developers → API Keys) to `.env` or Render's Environment.
Uses the `eleven_flash_v2_5` model and the default "George" voice; override with
`ELEVENLABS_MODEL` / `ELEVENLABS_VOICE_ID`.


### Vehicle lock sound

Locking or unlocking a car from its page plays the bundled key-fob sound in
`public/sfx/lock.mp3`. The **Sound Effects** switch under Profile → Preferences
turns it off on that device.

### Talking to the assistant

Tap the 🎤 button in the chat and speak; your words appear as you talk and are sent when you stop.
Uses the browser's built-in speech recognition (Chrome, Edge, Safari/iPhone, Android) — no key needed.
The button is hidden in browsers without it (e.g. Firefox). Needs https or localhost.
