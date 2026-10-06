FAIRSPOT (IS216 G9T6)
=====================

FairSpot finds the fairest public-transport meeting point for a group in
Singapore.


TECH STACK
----------

- Frontend: Vue 3 (Vite), Vue Router, Pinia, Bootstrap 5, Axios, Leaflet
- Backend: Node.js, Express, Mongoose (MongoDB Atlas)
- Package manager: pnpm
- Deployment: one Render service (Express serves the built Vue app)


REPO LAYOUT
-----------

    client/                         Vue app (created with pnpm create vue@latest)
      src/config.js                 BASE_URL for calls to the Express API
      src/router/index.js           routes (which URL shows which view)
      src/views/                    one file per screen
      src/components/               reusable pieces used by the views
      src/assets/main.css           global styles
    server/                         Express app
      server.js                     starts the app and mounts the API routes
      config/db.js                  MongoDB connection
      .env / .env.example           secrets (never committed) / empty template
      routes/                       API routes, mounted under /api
      controllers/                  handle each request
      models/                       Mongoose schemas and database functions
      services/                     calls to external APIs (OneMap, LTA, Geoapify)
      utils/                        pure helper functions (fairness ranking)
      data/                         static seed data (stations.json)
      scripts/                      seed scripts
      fixtures/                     sample API responses (example data)
    README.txt                      this file


SETUP
-----

Requires Node.js 22.18+ or 24.12+ (check with: node -v), and pnpm.

Server:

    cd server && pnpm install

Copy server/.env.example to server/.env, then fill in the values. .env is
gitignored: never commit it.

    cd server && cp .env.example .env

Client:

    cd client && pnpm install

Environment variables (in server/.env):

- ONEMAP_EMAIL, ONEMAP_PASSWORD: OneMap token (team Gmail account)
- LTA_ACCOUNT_KEY: LTA DataMall
- GEOAPIFY_API_KEY: Geoapify Places
- MONGODB_URI: MongoDB Atlas connection string


RUN THE APP IN DEVELOPMENT
--------------------------

Use two terminals.

Terminal 1 (Express API):

    cd server && pnpm dev

- Express API: http://localhost:8000
- Health check: http://localhost:8000/api/health

Terminal 2 (Vue app):

    cd client && pnpm dev

- Vue app: http://localhost:5173
- The client calls the API through client/src/config.js
  (http://localhost:8000/api in development).

Without MONGODB_URI the server still starts, but GET /api/health returns 503
because the OneMap token is stored in MongoDB.


API LIST
--------

All routes are mounted under /api in server/server.js.

- /api/health        working
- /api/meetups       in progress
- /api/ranking       in progress
- /api/venues        in progress
- /api/bus-arrival   in progress
- /api/users         in progress
- /api/reviews       in progress
- /api/votes         in progress


RUN IN PRODUCTION MODE
----------------------

Build the client:

    cd client && pnpm build

Start the server:

    cd server && NODE_ENV=production pnpm start

On Windows PowerShell, from the server folder:

    $env:NODE_ENV="production"; pnpm start

Express serves client/dist only when NODE_ENV=production.

Render settings (not yet tested on Render with pnpm):

- Build command:
      cd client && pnpm install --prod=false && pnpm build && cd ../server && pnpm install
  (Vite is a dev dependency of the client)
- Start command:
      cd server && pnpm start
- Environment: NODE_ENV=production plus every variable in server/.env.example
- Health check path: /api/health


MANUAL API TESTING (POSTMAN)
----------------------------

Meetup endpoints: in Postman click Import and choose
server/postman/fairspot-meetups.postman_collection.json, then run the requests
in order with the server running.


AI USAGE
--------

AI assistance was used only for boilerplate, as allowed by the
course AI usage policy: project and tool configuration, the Express bootstrap
and database connection file, the placeholder pages and navbar, and the saved
sample API responses. The team writes the business logic, the API endpoint
logic and the frontend interactivity.
