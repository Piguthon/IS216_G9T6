<!--
  FILE:     src/views/HomeView.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Landing page: one slice through Singapore, top to bottom. The billboard stands behind
            the city, then the street, the escalator into the station and the MRT platform.
  ROUTE:    /
  TALKS TO: links to /create, /join
  DATA:     none
  REVISE:   Wk 2 flexbox, position · Wk 3 grid, cards, buttons · Wk 4 RouterLink, v-for
  DONE WHEN:
    - [x] short "how it works" section
    - [x] create/join buttons
    - [x] responsive 375px→XL
    - [x] keep testids home-page, home-heading
-->
<script setup>
import { tripTone } from '../utils/trip-tone'

// Example group for the hero: travel times to Bishan MRT from four corners of Singapore.
// Illustrative numbers only; the real ranking comes from the results page.
const exampleTrips = [
  { name: 'Aisha', from: 'Tampines', minutes: 34 },
  { name: 'Wei Jie', from: 'Jurong East', minutes: 32 },
  { name: 'Marcus', from: 'Punggol', minutes: 29 },
  { name: 'Priya', from: 'Woodlands', minutes: 27 },
]
const longest = Math.max(...exampleTrips.map((t) => t.minutes))
const shortest = Math.min(...exampleTrips.map((t) => t.minutes))
const scaleMinutes = 45 // bar width is minutes / scaleMinutes

const steps = [
  {
    title: 'Create a meetup',
    text: 'Pick the occasion, date and time. You get a short code.',
  },
  { title: 'Share the code', text: "Everyone joins and adds where they're starting from." },
  {
    title: 'Pick a fair spot',
    text: 'Stations ranked by the longest trip. Vote, then find food nearby.',
  },
]
</script>

<template>
  <section data-testid="home-page">
    <!-- 1. Above ground: sky, far towers, the billboard, then the blocks and street in front of it -->
    <div class="hero">
      <div class="sun" aria-hidden="true"></div>
      <svg class="flat-cloud" viewBox="0 0 120 44" aria-hidden="true">
        <g fill="#fff">
          <ellipse cx="60" cy="32" rx="56" ry="12" />
          <circle cx="40" cy="24" r="16" />
          <circle cx="66" cy="18" r="18" />
          <circle cx="90" cy="28" r="12" />
        </g>
      </svg>
      <div class="skyline" aria-hidden="true"></div>
      <img class="hero-blimp" src="../assets/scene/blimp.svg" alt="" />

      <div class="container hero-front">
        <div class="giant">
          <div class="giant-lights" aria-hidden="true"></div>
          <div class="giant-panel">
            <div class="row align-items-center g-3 g-lg-4">
              <div class="col-lg-7">
                <h1 data-testid="home-heading">
                  <span class="visually-hidden">FairSpot: </span>Nobody gets the
                  <em>long ride.</em>
                </h1>
                <p class="giant-lead">
                  FairSpot finds the MRT station where the longest journey in your group is as short
                  as it can be, so everyone travels about the same.
                </p>
                <div class="d-flex giant-ctas">
                  <RouterLink
                    class="app-btn app-btn-lg btn-sign"
                    :to="{ name: 'create-meetup' }"
                    data-testid="home-create-link"
                  >
                    Create Meetup
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 12h13M12 5l7 7-7 7"
                        fill="none"
                        stroke="#fff"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </RouterLink>
                  <RouterLink
                    class="app-btn app-btn-lg btn-quiet"
                    :to="{ name: 'join-meetup' }"
                    data-testid="home-join-link"
                  >
                    Join with a code
                  </RouterLink>
                </div>
              </div>

              <div class="col-lg-5">
                <figure class="board mb-0" aria-label="Example: four friends meeting for dinner">
                  <div class="board-screen">
                    <div class="board-head">
                      <div>
                        <span class="board-label">Meeting at</span>
                        <p class="board-title app-doto mb-0">Bishan</p>
                      </div>
                      <div class="line-codes" aria-label="MRT lines">
                        <span class="line-code line-ns">NS17</span>
                        <span class="line-code line-cc">CC15</span>
                      </div>
                    </div>
                    <ul class="trips">
                      <li
                        v-for="trip in exampleTrips"
                        :key="trip.name"
                        class="trip"
                        :class="tripTone(trip.minutes, longest, shortest)"
                      >
                        <div class="trip-who">
                          <strong>{{ trip.name }}</strong>
                          <span>from {{ trip.from }}</span>
                        </div>
                        <div class="trip-track" aria-hidden="true">
                          <div
                            class="trip-fill"
                            :style="{ width: (trip.minutes / scaleMinutes) * 100 + '%' }"
                          ></div>
                        </div>
                        <span class="trip-mins">{{ trip.minutes }}<small>min</small></span>
                      </li>
                    </ul>
                  </div>
                </figure>
              </div>
            </div>
          </div>
          <div class="giant-legs" aria-hidden="true"><span></span><span></span></div>
        </div>
      </div>

      <div class="scene" aria-hidden="true">
        <img class="train" src="../assets/scene/mrt-train.svg" alt="" />
        <div class="bridge">
          <img class="deck" src="../assets/scene/overhead-bridge.svg" alt="" />
          <img class="walker" src="../assets/scene/pedestrian-office.svg" alt="" />
        </div>
        <img class="footpath" src="../assets/scene/pedestrian-auntie.svg" alt="" />
        <img class="vehicle bus" src="../assets/scene/bus-double-decker.svg" alt="" />
        <img class="vehicle car" src="../assets/scene/car.svg" alt="" />
        <img class="vehicle taxi" src="../assets/scene/taxi.svg" alt="" />
      </div>
    </div>

    <div class="tiled-wall">
      <!-- 2. Into the station: how it works on the way down the escalator -->
      <section class="descent" aria-labelledby="home-steps-title">
        <div class="container">
          <h2 id="home-steps-title" class="descent-title mb-0">How it works</h2>
          <ol class="way-signs row gx-4 list-unstyled mb-0">
            <li v-for="(step, i) in steps" :key="step.title" class="col-md-4">
              <div class="way-sign">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="way-num" aria-hidden="true">{{ i + 1 }}</span>
                  <h3 class="mb-0">{{ step.title }}</h3>
                </div>
                <p class="mb-0">{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </div>
        <img class="esc" src="../assets/scene/escalator.svg" alt="" />
      </section>

      <!-- 3. The platform: travel modes, then the train you came for -->
      <section class="station" aria-labelledby="home-modes-title">
        <div class="container">
          <div class="station-board">
            <h2 id="home-modes-title" class="mb-0">Every way you travel</h2>
          </div>
          <div class="row g-3 pb-3">
            <div class="col-md-4">
              <article class="poster h-100">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <rect x="10" y="4" width="28" height="32" rx="7" fill="#1d4f91" />
                    <rect x="14" y="9" width="20" height="11" rx="2" fill="#fff" />
                    <circle cx="17" cy="28" r="2.6" fill="#fff" />
                    <circle cx="31" cy="28" r="2.6" fill="#fff" />
                    <path
                      d="M14 44l5-8M34 44l-5-8"
                      stroke="#1d4f91"
                      stroke-width="3"
                      stroke-linecap="round"
                    />
                  </svg>
                  <span class="badge rounded-pill text-uppercase text-bg-success">Live</span>
                </div>
                <h3>MRT</h3>
                <p class="mb-0">
                  Candidate meeting points are MRT stations and bus interchanges, timed door to
                  door.
                </p>
              </article>
            </div>
            <div class="col-md-4">
              <article class="poster h-100">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <rect x="6" y="6" width="36" height="32" rx="6" fill="#1d4f91" />
                    <rect x="10" y="11" width="28" height="12" rx="2" fill="#fff" />
                    <circle cx="14" cy="31" r="2.6" fill="#fff" />
                    <circle cx="34" cy="31" r="2.6" fill="#fff" />
                    <rect x="10" y="38" width="6" height="6" rx="1.5" fill="#1d4f91" />
                    <rect x="32" y="38" width="6" height="6" rx="1.5" fill="#1d4f91" />
                  </svg>
                  <span class="badge rounded-pill text-uppercase text-bg-success">Live</span>
                </div>
                <h3>Bus</h3>
                <p class="mb-0">
                  Bus legs count in every journey, and the summary shows when your next bus comes.
                </p>
              </article>
            </div>
            <div class="col-md-4">
              <article class="poster h-100">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M8 30l4-12c1-3 3-4 6-4h12c3 0 5 1 6 4l4 12v8H8z" fill="#6b737a" />
                    <rect x="14" y="18" width="20" height="8" rx="2" fill="#fff" />
                    <circle cx="15" cy="38" r="4" fill="#3a3d41" />
                    <circle cx="33" cy="38" r="4" fill="#3a3d41" />
                  </svg>
                  <span class="badge rounded-pill text-uppercase text-bg-danger">
                    Coming soon
                  </span>
                </div>
                <h3>Car</h3>
                <p class="mb-0">
                  For groups where someone drives, so their trip counts fairly too.
                </p>
              </article>
            </div>
          </div>
        </div>
        <!-- The arrivals screen: an LED board on the wall, like the one on the hero -->
        <div class="container pb-4">
          <div
            class="app-ticket arrival-screen d-flex flex-wrap justify-content-between align-items-center gap-3 text-start"
          >
            <div>
              <span class="app-label">Next train</span>
              <p class="arrival-text app-doto mb-0">A FAIR SPOT</p>
            </div>
            <div class="d-flex flex-wrap gap-3">
              <RouterLink class="app-btn app-btn-lg btn-sign" :to="{ name: 'create-meetup' }">
                Create Meetup
              </RouterLink>
              <RouterLink class="app-btn app-btn-lg btn-quiet" :to="{ name: 'join-meetup' }">
                Join with a code
              </RouterLink>
            </div>
          </div>
        </div>
        <div class="platform" aria-hidden="true">
          <img class="pf-train" src="../assets/scene/mrt-train.svg" alt="" />
          <div class="platform-doors"></div>
        </div>
        <div class="floor" aria-hidden="true"></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
/* 1. The hero fits between the navbar and the bottom of the screen. Everything inside is sized
      in em, so changing .hero's font-size scales the whole scene. --chrome is the navbar height.
      All scene art is drawn for this project, in src/assets/scene/. */
.hero {
  --chrome: 68px;
  --scene-h: 30em;
  --sink: 6.6em; /* how far the billboard sits behind the rooftops */
  position: relative;
  z-index: 0;
  overflow: hidden;
  padding-top: 2.4em;
  background: linear-gradient(180deg, #78c1ea 0%, #a9dbf3 45%, #e3f3fa 100%);
  font-size: clamp(7.5px, min(0.7vw, (100svh - var(--chrome)) / 74), 13px);
}

.sun {
  position: absolute;
  top: 2.4em;
  right: 4%;
  width: 6.4em;
  height: 6.4em;
  border-radius: 50%;
  background-color: #fbd24e;
  box-shadow: 0 0 0 1.1em rgba(251, 210, 78, 0.3);
}

.flat-cloud {
  position: absolute;
  z-index: 1;
  top: 13em;
  right: 3%;
  width: 12em;
}

.hero-blimp {
  position: absolute;
  z-index: 1;
  top: 2.4em;
  left: 2.5%;
  width: 15em;
  animation: bob 7s ease-in-out infinite alternate;
}

.skyline {
  position: absolute;
  z-index: 0;
  inset: 0 0 14em;
  background:
    url('../assets/scene/cbd-skyline.svg') repeat-x center top 3em / auto 50em,
    linear-gradient(#b6ccd9, #b6ccd9) no-repeat center 53em / 100% 100%;
}

.hero-front {
  position: relative;
  z-index: 1;
}

.giant {
  position: relative;
  max-width: 100em;
  margin: 0 auto;
  padding: 1.2em;
  border-radius: 1em;
  background-color: #2a2d36;
  box-shadow: inset -0.9em 0 0 #1e2028;
}

.giant-lights {
  height: 1.2em;
  margin: 0 0.8em 0.8em;
  background: radial-gradient(circle, #ffe9a8 0.32em, transparent 0.36em) 0 0 / 3.4em 1.2em repeat-x;
}

.giant-panel {
  padding: 2.4em 3em calc(var(--sink) + 0.6em); /* the lower padding keeps words above the roofs */
  border-radius: 4px;
  background-color: #0a0b0c;
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1.4px);
  background-size: 5px 5px;
  color: #ffffff;
}

.giant h1 {
  margin-bottom: 0.2em;
  color: #f4f4f1;
  font-size: 7.4em;
}

.giant h1 em {
  color: #f2c230;
  font-style: normal;
}

.giant-lead {
  margin-bottom: 1.1em;
  color: #e4e6e8;
  font-size: 1.8em;
  line-height: 1.5;
}

.giant-ctas {
  gap: 1.4em;
}

.giant .app-btn-lg {
  gap: 0.7em;
  padding: 0.85em 1.4em;
  font-size: 1.7em;
}

.giant .app-btn-lg svg {
  flex: none;
  width: 1.3em;
  height: 1.3em;
}

.board-screen {
  padding: 1.8em 1.8em 1.4em;
  border-radius: 6px;
  background-color: #111317;
  box-shadow: inset 0 0 0 2px #2d3036;
}

.board-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1em;
  margin-bottom: 1.2em;
  padding-bottom: 1.1em;
  border-bottom: 2px dashed #3a3d41;
}

.board-label {
  font-size: 1.1em;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.board-title {
  margin-top: 6px;
  font-size: 3.2em;
  line-height: 1;
  text-transform: uppercase;
}

.line-codes {
  display: flex;
  gap: 0.6em;
}

.line-code {
  padding: 0.3em 0.7em;
  border-radius: 6px;
  color: #ffffff;
  font-size: 1.1em;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.line-ns {
  background-color: #d42e12;
}

.line-cc {
  background-color: #fa9e0d;
  color: #111111;
}

.board .trips {
  gap: 1.1em;
}

.board .trip {
  grid-template-columns: minmax(0, 10.5em) minmax(0, 1fr) 6.6em;
  gap: 1.2em;
}

.board .trip-who strong {
  font-size: 1.5em;
}

.board .trip-who span {
  font-size: 1.2em;
}

.board .trip-track {
  height: 0.9em;
}

.board .trip-mins {
  font-size: 2.5em;
}

.board .trip-mins small {
  font-size: 0.42em;
}

.giant-legs {
  position: absolute;
  top: 100%;
  left: 14%;
  right: 14%;
  display: flex;
  justify-content: space-between;
  height: calc(var(--scene-h) - var(--sink));
}

.giant-legs span {
  position: relative;
  width: 2.4em;
  background-color: #6b737a;
  box-shadow: inset 0.8em 0 0 #8d959c;
}

.giant-legs span::before {
  content: '';
  position: absolute;
  top: 0;
  left: -0.6em;
  right: -0.6em;
  height: 1.2em;
  background-color: #565c70;
}

/* The street scene: inside .scene, 1em = 1% of the scene's height */
.scene {
  position: relative;
  z-index: 2;
  overflow: hidden;
  height: 100em;
  margin-top: -22em;
  background: url('../assets/scene/street-city.svg') repeat-x center bottom / auto 100%;
  font-size: 0.3em;
}

.scene img {
  position: absolute;
  display: block;
}

.train {
  bottom: 62em;
  left: -150em;
  z-index: 1;
  height: 9em;
  animation: drive-right 11s linear infinite;
}

.bridge {
  position: absolute;
  bottom: 21.5em;
  left: 54%;
  z-index: 2;
  width: 150em;
  height: 37.5em;
}

.scene .bridge .deck {
  position: static;
  width: 100%;
  height: 100%;
}

.walker {
  bottom: 26em;
  left: 35em;
  height: 6.75em;
  animation: walk-deck 22s linear infinite;
}

.footpath {
  bottom: 22.5em;
  left: 12%;
  z-index: 3;
  height: 6.75em;
  animation: stroll 40s linear infinite;
}

.vehicle {
  z-index: 4;
}

.bus {
  bottom: 10.5em;
  left: -50em;
  height: 17.5em;
  animation: drive-right 13s linear infinite;
}

.car {
  bottom: 10.5em;
  left: -20em;
  height: 7em;
  animation: drive-right 8s linear infinite;
  animation-delay: -3s;
}

.taxi {
  bottom: 1em;
  left: 100%;
  z-index: 5;
  height: 7.4em;
  animation: drive-left 7s linear infinite;
}

/* The escalator and the platform share one tiled wall, so the tile lines stay unbroken */
.tiled-wall {
  background-color: #efe9dc;
  background-image:
    linear-gradient(#e2dac9 2px, transparent 2px),
    linear-gradient(90deg, #e2dac9 2px, transparent 2px);
  background-size: 64px 64px;
}

/* 2. Down the escalator: the signs hang lower as you descend */
.descent {
  position: relative;
  overflow: hidden;
  padding-top: 32px;
}

.descent-title {
  position: relative;
  z-index: 2;
  font-size: clamp(32px, 3.6vw, 44px);
}

.way-signs {
  position: relative;
  z-index: 2;
  margin-top: 44px;
}

.way-signs::before {
  content: '';
  position: absolute;
  top: -28px;
  left: 0;
  right: 0;
  height: 8px;
  background-color: #6b737a;
}

.way-sign {
  position: relative;
  padding: 12px 16px 14px;
  border-radius: 8px;
  background-color: #f2c230;
  box-shadow: 0 5px 0 #c79c1f;
  color: #111111;
}

.way-sign::before,
.way-sign::after {
  content: '';
  position: absolute;
  bottom: 100%;
  width: 5px;
  height: 22px;
  background-color: #6b737a;
}

.way-sign::before {
  left: 16%;
}

.way-sign::after {
  right: 16%;
}

.way-num {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #111111;
  color: #f2c230;
  font-size: 17px;
  font-weight: 800;
}

.way-sign h3 {
  font-size: 23px;
}

.way-sign p {
  color: #1f1a06;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
}

.esc {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: auto;
  margin-top: calc(-6vw - 64px);
}

/* 3. Platform */
.station-board {
  margin: 18px 0;
  color: #000000;
}

.station-board h2 {
  font-size: clamp(28px, 3.6vw, 40px);
}

.poster {
  padding: 12px 16px;
  border: 4px solid #f2c230;
  border-radius: 8px;
  background-color: #ffffff;
}

.poster svg {
  flex: none;
  width: 32px;
  height: 32px;
}

.poster h3 {
  font-size: 24px;
}

.poster p {
  color: #33373a;
  font-size: 14px;
  line-height: 1.45;
}

/* The board's casing has a hard shadow below it, and the words glow like lit LEDs */
.arrival-screen {
  padding: 20px 28px;
  box-shadow: 0 6px 0 #1e2028;
}

.arrival-text {
  color: #f2c230;
  font-size: clamp(32px, 4.4vw, 52px);
  line-height: 1.1;
  text-shadow: 0 0 12px rgba(242, 194, 48, 0.5);
}

.platform {
  position: relative;
  overflow: hidden;
  height: 150px;
  background-color: #14161a;
}

.pf-train {
  position: absolute;
  bottom: 8px;
  left: -2500px;
  height: 100px;
  max-width: none;
  animation: pf-pass 13s linear infinite;
}

.platform-doors {
  position: absolute;
  inset: 0;
  background: url('../assets/scene/platform-doors.svg') repeat-x center bottom / auto 100%;
}

.floor {
  height: 46px;
  border-top: 6px solid #6b737a;
  background-color: #b9b4a8;
}

.floor::before {
  content: '';
  display: block;
  height: 10px;
  margin-top: 8px;
  background-color: #f2c230;
}

@keyframes bob {
  from {
    transform: translateY(-8px);
  }
  to {
    transform: translateY(8px);
  }
}

@keyframes drive-right {
  from {
    left: -150em;
  }
  to {
    left: 100%;
  }
}

@keyframes drive-left {
  from {
    left: 100%;
  }
  to {
    left: -30em;
  }
}

@keyframes walk-deck {
  from {
    left: 35em;
  }
  to {
    left: 112em;
  }
}

@keyframes stroll {
  from {
    left: -3%;
  }
  to {
    left: 103%;
  }
}

@keyframes pf-pass {
  from {
    left: -2500px;
  }
  to {
    left: 100%;
  }
}

/* Below lg (Bootstrap's 992px) the board stacks under the headline */
@media (max-width: 991px) {
  .hero {
    --scene-h: 16em;
    --sink: 3.5em;
    padding-top: 1.2em;
    font-size: 10px;
  }

  .sun,
  .flat-cloud,
  .hero-blimp {
    display: none;
  }

  .skyline {
    inset: 0 0 10em;
    background-position:
      center top -8em,
      center 42em;
  }

  .giant-panel {
    padding: 1.6em 1.6em calc(var(--sink) + 0.6em);
  }

  .giant h1 {
    font-size: 4.6em;
  }

  .giant-lead {
    margin-bottom: 0.9em;
    font-size: 1.55em;
    line-height: 1.4;
  }

  .giant-ctas {
    gap: 0.8em;
  }

  .giant .app-btn-lg {
    flex: 1 1 0;
    gap: 0.5em;
    padding: 1em 0.5em;
    font-size: 1.35em;
    white-space: nowrap;
  }

  .board-screen {
    padding: 1.2em 1.2em 1em;
  }

  .board-head {
    align-items: center;
    margin-bottom: 0.8em;
    padding-bottom: 0.8em;
  }

  .board-head > div:first-child {
    display: flex;
    align-items: baseline;
    gap: 0.8em;
  }

  .board-title {
    margin-top: 0;
    font-size: 2.4em;
  }

  .board-label {
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .board .trips {
    gap: 0.6em;
  }

  .board .trip {
    grid-template-columns: minmax(0, 7em) minmax(0, 1fr) 5.6em;
    gap: 1em;
  }

  .board .trip-who span {
    display: none;
  }

  .board .trip-mins {
    font-size: 2.1em;
  }

  .giant-legs span {
    width: 1.8em;
    box-shadow: inset 0.6em 0 0 #8d959c;
  }

  .scene {
    font-size: 0.16em;
  }
}

/* Above md (Bootstrap's 768px) the three signs step down with the escalator */
@media (min-width: 768px) {
  .way-signs li:nth-child(2) .way-sign {
    margin-top: 50px;
  }

  .way-signs li:nth-child(3) .way-sign {
    margin-top: 100px;
  }

  .way-signs li:nth-child(2) .way-sign::before,
  .way-signs li:nth-child(2) .way-sign::after {
    height: 72px;
  }

  .way-signs li:nth-child(3) .way-sign::before,
  .way-signs li:nth-child(3) .way-sign::after {
    height: 122px;
  }
}

@media (max-width: 767px) {
  .way-signs {
    display: grid;
    gap: 26px;
    margin-top: 40px;
  }

  .esc {
    height: 220px;
    margin-top: 4px;
    object-fit: cover;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-blimp,
  .train,
  .walker,
  .footpath,
  .bus,
  .car,
  .taxi,
  .pf-train {
    animation: none;
  }

  .train {
    left: 8%;
  }

  .bus {
    left: 20%;
  }

  .car {
    left: 62%;
  }

  .taxi {
    left: 74%;
  }

  .pf-train {
    left: 5%;
  }
}
</style>
