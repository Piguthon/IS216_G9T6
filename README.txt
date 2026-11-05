================================================================================
FAIRSPOT  -  IS216 Web Application Development II, Group G9T6
================================================================================

FairSpot finds the fairest place in Singapore for a group to meet. Everyone
adds where they are starting from, and FairSpot picks the MRT station or bus
interchange where the LONGEST journey in the group is as short as possible, so
nobody gets stuck with the long ride.

LINKS
-----
  Deployed app (first page) : https://is216-g9t6.onrender.com
  GitHub repository         : https://github.com/Piguthon/IS216_G9T6
  Video walkthrough         : https://www.youtube.com/watch?v=PInCwTcjcbw

LOGIN DETAILS
-------------
  No ready-made account is needed. Click "Sign up" on the app to create one
  (any email address works; it is never contacted).
  Guests can join a meetup with just the meetup code and a name.
  Grader accounts with sample data are in section 5a.
  Optional demo accounts for the live map are in section 6.

  Please test in Google Chrome.


CONTENTS
--------
  1. The problem and our solution
  2. Tech stack
  3. SETUP: install and run the app (step by step)
  4. Troubleshooting
  5. Trying the app (a walkthrough of the main user journey)
  5a. Grader accounts (sample data)
  6. Trying the live map (demo script)
  7. Testing
  8. Deployment (Render)
  9. Project structure
 10. Data store
 11. External APIs, libraries and credits
 12. Known limitations
 13. AI usage


================================================================================
1. THE PROBLEM AND OUR SOLUTION
================================================================================

Problem: when friends from different parts of Singapore meet, they usually
pick a place that is convenient for one or two people, and someone ends up
travelling for over an hour. Picking a "middle" point on a map does not help,
because the travel time depends on train lines and bus routes, not distance.

Solution: FairSpot uses real public-transport (and driving) travel times.
  1. A host creates a meetup (occasion, date, time) and shares a 6-character
     code. Logged-in hosts can also add people they often meet.
  2. Members join with the code (an account is optional), choose their start
     point (address/postal search or a saved location), choose public
     transport or car, and confirm their location.
  3. The host works out the fair meeting points. FairSpot takes the 30 MRT
     stations nearest the group's midpoint (and nearby bus interchanges), gets
     every member's real trip time to each from OneMap, and ranks them:
     the shortest longest-journey wins; ties go to the lowest total time.
  4. Members vote on the top meeting points, then on places to eat or shop
     near the chosen one (Geoapify). The host confirms each final choice.
  5. The summary shows when each person should leave, their step-by-step
     route and live arrival times for their buses (LTA DataMall).
  6. On the day, members can share their live location on a map, from 1 hour
     before the meetup to 30 minutes after it starts.

Other features: My Meetups (current and past meetups, notices), a profile with
saved start locations, favourite venues, account settings,
and editing, deleting and removing members for hosts.


================================================================================
2. TECH STACK
================================================================================

  Front end      Vue 3 (Composition API, <script setup>), built with Vite
                 Vue Router (pages and a login guard)
                 Pinia (shared login and favourites state)
                 Bootstrap 5 (layout, components, responsive grid) with our own
                 theme in client/src/assets/main.css
                 Axios (requests to our API and to OneMap search)
                 Leaflet (maps), with OneMap map tiles

  Back end       Node.js with Express (REST API under /api)
                 Routes -> controllers -> models
                 bcrypt (password hashing) and session tokens for login

  Database       MongoDB Atlas, through Mongoose (section 10)

  External APIs  OneMap: address search, public-transport and driving routes
                 LTA DataMall: live bus arrival times
                 Geoapify Places: restaurants, cafes, food courts and malls

  Testing        Vitest with Vue Test Utils (unit, component, integration)
                 Playwright (end-to-end)

  Deployment     Render: one web service where Express serves both the API
                 and the built Vue app (section 8)

  Tooling        pnpm, ESLint, Oxlint, Prettier, nodemon, Postman


================================================================================
3. SETUP: INSTALL AND RUN THE APP (STEP BY STEP)
================================================================================

Follow the steps in order. Commands are typed in a terminal (macOS Terminal,
or PowerShell on Windows). Where macOS and Windows differ, both are shown.

--------------------------------------------------------------------------------
STEP 1. Check you have the tools
--------------------------------------------------------------------------------

  a) Node.js 22.18 or newer (or 24.12 or newer). Check with:

         node -v

     If it is missing or older, install the LTS version from
     https://nodejs.org

  b) pnpm (the package manager used by the course). Check with:

         pnpm -v

     If it is missing, install it with:

         npm install -g pnpm

  c) Google Chrome, and an internet connection (the app calls online APIs).

  d) Ports 8000 (API) and 5173 (Vue app) must be free.

--------------------------------------------------------------------------------
STEP 2. Get the code
--------------------------------------------------------------------------------

  Either unzip the submitted application folder, or clone the repository:

         git clone https://github.com/Piguthon/IS216_G9T6.git

  Then open a terminal in the project folder (the folder that contains
  "client" and "server"). All commands below start from this folder.

--------------------------------------------------------------------------------
STEP 3. Install the dependencies
--------------------------------------------------------------------------------

         cd server
         pnpm install
         cd ../client
         pnpm install
         cd ..

  This can take a minute or two the first time.

--------------------------------------------------------------------------------
STEP 4. Create the server's settings file (server/.env)
--------------------------------------------------------------------------------

  The server needs API keys and a database address. They are kept in a file
  called .env in the server folder. It is not in the GitHub repository because
  the repository is public.

  OPTION A (recommended, quickest): use our keys

    Our filled-in settings file is included in the eLearn submission zip as
    "server.env.txt". Copy it into the server folder and rename it to ".env":

      macOS:
         cp /path/to/server.env.txt server/.env

      Windows (PowerShell):
         Copy-Item C:\path\to\server.env.txt server\.env

    It points at our MongoDB Atlas database, which already has all the
    stations loaded, so you can skip STEP 5.

  OPTION B: use your own free keys

    1) Copy the empty template:

         macOS:               cp server/.env.example server/.env
         Windows PowerShell:  Copy-Item server\.env.example server\.env

    2) Fill in each line of server/.env:

       ONEMAP_EMAIL, ONEMAP_PASSWORD
           Register a free account at https://www.onemap.gov.sg/apidocs
           and use the same email and password here.

       LTA_ACCOUNT_KEY
           Request a free API account at https://datamall.lta.gov.sg
           (the AccountKey is emailed to you).

       GEOAPIFY_API_KEY
           Create a free project at https://www.geoapify.com and copy its
           API key.

       MONGODB_URI
           Create a free cluster at https://www.mongodb.com/atlas, add a
           database user, and under Network Access allow your IP address (or
           0.0.0.0/0). Copy the "Connect > Drivers" connection string, fill
           in the password, and add a database name before the "?", e.g.
           mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/fairspot?...

       DEMO_PASSWORD
           Only needed for the live map demo (section 6). Any password.

    3) Continue with STEP 5 (a new database has no stations yet).

--------------------------------------------------------------------------------
STEP 5. Load the meeting-point stations (OPTION B only)
--------------------------------------------------------------------------------

  This copies 151 candidate meeting points (146 MRT stations and 5 bus
  interchanges) from server/data/stations.json into the database:

         cd server
         node scripts/seed-stations.js
         cd ..

  It prints nothing when it succeeds. If something is wrong it prints
  "Station seeding failed: ..." (check MONGODB_URI in server/.env).
  Running it again is safe: it updates the stations instead of copying them
  twice.

--------------------------------------------------------------------------------
STEP 6. Run the app
--------------------------------------------------------------------------------

    Terminal 1, the API:

         cd server
         pnpm dev

      Wait for:  [db] connected to MongoDB
                 [server] listening on port 8000 (development)

    Terminal 2, the Vue app:

         cd client
         pnpm dev

    Open http://localhost:5173 in Chrome.

  To stop the app, press Ctrl + C in each terminal.

--------------------------------------------------------------------------------
STEP 7. Check that it works
--------------------------------------------------------------------------------

  a) Open http://localhost:8000/api/health
     You should see  {"onemap":{"ok":true, ... }}
     This means the database and the OneMap account both work.

  b) Open the app, click "Sign up", create an account, then click
     "Create Meetup". If you get a 6-character code, the app is ready.

  Then follow the walkthrough in section 5.


================================================================================
4. TROUBLESHOOTING
================================================================================

  Problem                                What to do
  -------------------------------------  ---------------------------------------
  "pnpm: command not found"              npm install -g pnpm, then open a new
                                         terminal.

  "[db] MONGODB_URI is not set"          server/.env is missing or in the wrong
                                         folder. It must be server/.env
                                         (STEP 4).

  "[db] connection failed"               Check MONGODB_URI, and that your IP
                                         address is allowed under Network
                                         Access in MongoDB Atlas.

  /api/health shows "ok": false          Check ONEMAP_EMAIL and ONEMAP_PASSWORD.
  (status 503)                           The database must also be connected
                                         (the OneMap token is stored there).

  "Port 8000 / 5173 is already in use"   Another program is using the port.
                                         Stop it, or stop an older copy of this
                                         app (Ctrl + C in its terminal).

  Error about bcrypt during or after     Run "pnpm install" again in server/.
  pnpm install                           server/pnpm-workspace.yaml allows
                                         bcrypt's build step.

  The results page says no routes        OPTION B only: run STEP 5 to load the
  were found                             stations.

  Address search shows no suggestions    Type at least 3 characters. It needs
                                         an internet connection (OneMap).

  "Share my location" does nothing       The browser only allows location on
  on the live map                        https:// or http://localhost pages,
                                         and you must click "Allow".

  The deployed app is slow to open       The free Render plan sleeps when idle;
                                         the first page can take up to a minute.


================================================================================
5. TRYING THE APP (WALKTHROUGH OF THE MAIN USER JOURNEY)
================================================================================

  Use two browser windows: a normal Chrome window for the host, and an
  Incognito window for a friend (a guest).

   1. Host window: Sign up, then click "Create Meetup". Enter an occasion,
      a date and a time, and click Create. Copy the 6-character code.
   2. Click "Go to meetup" to open the lobby.
   3. Guest window: open the app, click "Join Meetup", enter the code and a
      name. No account signup is needed.
   4. In BOTH windows: search for a start point (e.g. a postal code such as
      178902, or "Tampines MRT"), pick a suggestion, choose "Public
      transport" or "Car", and click "Confirm location". The lobby updates by
      itself every few seconds.
   5. Host window: click "See fair meeting points". Working out real travel
      times takes up to about a minute. The fairest points are listed, with
      everyone's trip time and a map.
   6. Guest window: from the lobby click "Vote on meeting points" and vote.
   7. Host window: the vote count updates; click "Confirm as final".
   8. Both windows: vote for a place nearby in "Places near ...", and the
      host confirms the venue.
   9. Open "See the summary": each person's leave-by time, the route step by
      step, and live bus arrival times for buses in the route.
  10. Host window: try "My Meetups" (current and past meetups) and "Profile"
      (saved locations, favourites, account settings).


--------------------------------------------------------------------------------
5a. Grader accounts (sample data) (Login details unavailable on public repo)
--------------------------------------------------------------------------------

  To see what a frequent user's account looks like, log in with one of these
  accounts. They already have current and past meetups at every stage
  (waiting for members, voting, confirmed), saved start locations, favourite
  venues, notices and people they often meet.

      Email:   Password:
      Email:   Password:

  - They work on the deployed app, and with this application folder when it
    uses our settings file (SETUP STEP 4, OPTION A). They do not exist in a
    database you create yourself (OPTION B).


================================================================================
6. TRYING THE LIVE MAP (DEMO SCRIPT)
================================================================================

  The live map only opens from 1 hour before a meetup until 30 minutes after
  it starts, so a demo script was included to simulate the live map feature.
  It needs DEMO_PASSWORD in server/.env (included in OPTION A).

         cd server
         node scripts/demo-live-map.js

  The script creates meetup DEMO01 with two real accounts and four simulated
  members. Leave it running, then in the app log in as:

      Email: demo.host@fairspot.test    Password: the DEMO_PASSWORD value
      Email: demo.guest@fairspot.test   Password: the DEMO_PASSWORD value

  Open http://localhost:5173/meetup/DEMO01/live (or :8000 in WAY 2), then
  press Enter in the script's terminal to set the simulated members moving
  towards the meeting point. Click "Share my location" to appear on the map.

  Press Ctrl + C to stop the script. To delete the demo meetup and accounts:

         node scripts/demo-live-map.js --clean


================================================================================
7. TESTING
================================================================================

  We used the testing tools taught in the course: Vitest with Vue Test Utils
  for unit, component and integration tests, and Playwright for end-to-end
  tests. There are 153 automated tests in total.

  Test types:
    Unit         one function on its own, with fixed inputs
    Component    one Vue component, mounted with props: what it shows and
                 which events it emits
    Integration  a whole page mounted with its real child components (Axios is
                 mocked, so no server is needed)
    End-to-end   the real app in Chrome with the real API and database,
                 following a user's journey (setup -> actions -> assert)

--------------------------------------------------------------------------------
7.1 Before running tests (once)
--------------------------------------------------------------------------------

  1. Complete SETUP steps 1 to 4 (and step 5 for OPTION B).
  2. Download the browser Playwright uses:

         cd client
         pnpm exec playwright install chromium
         cd ..

--------------------------------------------------------------------------------
7.2 Run the tests
--------------------------------------------------------------------------------

  Server unit tests (58 tests):

         cd server
         pnpm test --run

  Client unit, component and integration tests (76 tests):

         cd client
         pnpm test:unit --run

  End-to-end tests (19 tests):

         cd client
         pnpm test:e2e

    This starts the API and the Vue app by itself (or uses them if they are
    already running), then runs every test in client/e2e/ in Chromium.
    It takes about 2 minutes.

    Useful options:
         pnpm test:e2e --headed                   watch the browser
         pnpm test:e2e e2e/lobby.spec.js          run one file
         pnpm exec playwright show-report         open the HTML report

  Notes:
    - E2E tests need server/.env and the database: every test signs up its
      own new account (e2e+<time>-<random>@fairspot.test) and creates its own
      meetup, so the tests can be run again and again, in any order.
    - results-voting.spec.js gets real travel times from OneMap and can take
      about a minute.

--------------------------------------------------------------------------------
7.3 Test cases
--------------------------------------------------------------------------------

  END-TO-END (client/e2e/)
  File                      Tests  What it checks
  ------------------------  -----  ---------------------------------------------
  auth.spec.js                  5  sign up opens the profile; log out; log in
                                   again; wrong password shows an error;
                                   /create redirects to /login when logged out
  create-meetup.spec.js         3  empty form shows an error; a valid meetup
                                   gets a 6-character code; "Go to meetup"
                                   opens the lobby with the same code
  join-meetup.spec.js           2  unknown code shows an error; a guest who
                                   joins appears in the host's member list
  lobby.spec.js                 2  set a start point, switch to car and confirm;
                                   the host only gets the results link once
                                   both members have confirmed
  results-voting.spec.js        1  full core journey: ranking, the guest votes,
                                   the host confirms, the summary opens
  profile.spec.js               4  add, rename, set as default and delete a
                                   saved location
  member-security.spec.js       1  someone who only knows the code cannot
                                   change a member (403), and the lobby is
                                   unchanged
  home.spec.js                  1  the home page shows MRT, Bus and Car as live

  INTEGRATION (client/src/components/__tests__/)
  File                               Tests  What it checks
  ---------------------------------  -----  ------------------------------------
  MeetupLobbyIntegration.spec.js         5  lobby shows the meetup and members;
                                            travel mode and confirm requests;
                                            results link; unknown code
  JoinMeetupIntegration.spec.js          5  empty fields; unknown code; joining
                                            opens the lobby; name already taken;
                                            a guest rejoining
  CreateMeetupIntegration.spec.js        5  empty form; a time today that has
                                            already passed; code shown after
                                            creating; Go to meetup; server error

  COMPONENT (client/src/components/__tests__/)
  File                               Tests  What it checks
  ---------------------------------  -----  ------------------------------------
  VotePanel.spec.js                      9  vote and confirm; confirmed choice
  MemberList.spec.js                     9  (you)/(host) labels, waiting, car,
                                            host-only Remove
  BusArrivalCard.spec.js                 7  loading, arrival times, errors,
                                            retry
  EditMeetupForm.spec.js                 7  validation, past dates, a time
                                            today that has already passed,
                                            save, cancel
  MeetingPointCard.spec.js               6  rank, name, trip times, select
  TravelModePicker.spec.js               5  chosen mode is emitted and shown
  SavedStartPointPicker.spec.js          4  saved locations as start points
  VenueList.spec.js                      2  "Show more places"

  UNIT
  File                               Tests  What it checks
  ---------------------------------  -----  ------------------------------------
  server/utils/__tests__/
    fairness.spec.js                    14  the fairness ranking, midpoint,
                                            distance, choosing candidates
    meetup-date.spec.js                 18  valid meetup dates; meetup times
                                            that have already passed (and
                                            invalid times); travel-time rules
                                            for late-night meetups; Singapore
                                            time
    live-window.spec.js                  9  when the live map opens and closes
    route-privacy.spec.js                4  routes are hidden from non-members
    polyline.spec.js                     2  decoding route lines for the map
  server/middleware/__tests__/
    member.spec.js                      11  which member is making a request
                                            (login, guest token, none, wrong)
  client/src/utils/__tests__/
    live-time.spec.js                    5  "time ago" text, stale locations
    route-steps.spec.js                  5  route step wording
    trip-tone.spec.js                    2  red / amber / green trip colours

  Manual API testing: server/postman/fairspot-meetups.postman_collection.json
  can be imported into Postman (Import > choose the file) and run in order
  while the server is running.


================================================================================
8. DEPLOYMENT (RENDER)
================================================================================

  The deployed app is one Render web service: Express serves both the API
  and the built Vue app, so the first page is at the root of the URL.

  Settings used:
    Root directory : (blank, the repository root)
    Build command  : cd client && pnpm install --prod=false && pnpm build
                     && cd ../server && pnpm install
    Start command  : cd server && pnpm start
    Environment    : NODE_ENV=production, plus every variable from
                     server/.env (STEP 4)
    Health check   : /api/health

  MongoDB Atlas Network Access must allow Render to connect (0.0.0.0/0).


================================================================================
9. PROJECT STRUCTURE
================================================================================

  client/                       Vue 3 app (created with pnpm create vue@latest)
    index.html                  the single HTML page
    src/main.js                 starts Vue, Pinia, Vue Router and Bootstrap
    src/config.js               the API address (development / production)
    src/router/index.js         which URL shows which page; login guard
    src/views/                  one file per page
    src/components/             reusable parts of pages
    src/stores/                 Pinia stores (login, favourites)
    src/utils/                  small helper functions
    src/assets/                 main.css (theme) and illustrations
    src/**/__tests__/           Vitest tests
    e2e/                        Playwright tests
  server/                       Express API
    server.js                   connects to MongoDB, mounts the routes, starts
                                the server (and serves the Vue app in
                                production)
    routes/                     URL paths, each pointing to a controller
    controllers/                handle each request and reply with JSON
    models/                     Mongoose schemas and database functions
    middleware/                 login check and meetup-member check
    services/                   calls to OneMap, LTA DataMall and Geoapify
    utils/                      helper functions (fairness ranking, dates, ...)
    data/stations.json          candidate meeting points
    scripts/                    seed-stations.js (STEP 5), demo-live-map.js
                                (section 6)
    postman/                    Postman collection for manual API testing
    sample-data/                saved example responses from the APIs
    .env.example                template for server/.env


================================================================================
10. DATA STORE
================================================================================

  MongoDB Atlas, accessed through Mongoose. Collections:

    users      accounts (bcrypt-hashed passwords), saved locations, favourites
    meetups    meetups, their members and start points, the saved ranking and
               the confirmed meeting point and venue
    votes      one vote per member per round (meeting point, venue)
    locations  live map locations; MongoDB deletes each one 2 hours after its
               last update to ensure privacy
    notices    short messages on My Meetups
    stations   candidate meeting points (loaded in STEP 5)
    tokens     the OneMap access token, reused until it expires due to OneMap's
               strict token access.

  The browser's localStorage keeps the login session token and, for each
  meetup, which member "you" are.


================================================================================
11. EXTERNAL APIS, LIBRARIES AND CREDITS
================================================================================

  External APIs (all called with Axios, async/await):
    OneMap (Singapore Land Authority)  address search, public-transport and
                                       driving routes, map tiles
                                       https://www.onemap.gov.sg
    LTA DataMall                       live bus arrival times
                                       https://datamall.lta.gov.sg
    Geoapify Places                    restaurants, cafes, food courts and
                                       malls near the meeting point
                                       https://www.geoapify.com

  Data: server/data/stations.json was compiled by the team from OneMap
  search and LTA DataMall bus stop data. Map tiles: OneMap,
  (c) contributors | Singapore Land Authority.

  Libraries used:
    Front end   Vue 3, Vue Router, Pinia, Bootstrap 5, Axios, Leaflet
    Back end    Express, Mongoose, bcrypt, cors, dotenv, nodemon
    Testing     Vitest, Vue Test Utils, jsdom, Playwright
    Tooling     Vite, ESLint, Oxlint, Prettier
  Fonts: Mona Sans and Doto (Google Fonts, SIL Open Font License 1.1).


================================================================================
12. KNOWN LIMITATIONS
================================================================================

  - Working out the fair meeting points calls OneMap for every member and
    candidate station, so it can take up to about a minute.
  - Car trip times come from OneMap's driving route and do not include
    traffic, As such, FairSpot adds 10 minutes to account for parking & traffic.
  - The live map only opens from 1 hour before to 30 minutes after the
    meetup, needs a login, and the page must stay open to keep sharing.
  - The free Render plan sleeps when idle, so the first visit can be slow.
  - Meetup lobbies were kept to a maximum of 6 to ensure accuracy and prevent 
    long calculation times.


================================================================================
13. AI USAGE
================================================================================

 - Used for intial setup, boilerplate code and snippets during development
 - Generated custom SVGs with animations for homepage and loading screenshots
 - Assisted in writing custom demo scripts to illustrate live mapping feature
 - Assisted in writing comments in order for ease of understanding between 
   group members during development
 - Assisted in debugging and managing merge conflicts between development branches
 - Generating initial test data for use during development to prevent constant
   API calls.
 - Assisted in generating unit test cases and e2e debugging.
 - Used as a guide for intial render deployment
 - Used for structuring, writing setup instructions, troubleshooting and proper 
   creditting in README.txt
 - Assisted in by giving hints and syntax help for codes not taught within 
   syllabus (leaflet, keyframes... etc)