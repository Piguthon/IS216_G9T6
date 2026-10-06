/*
  FILE:            services/geoapify.js
  OWNER:           P2 (team-written)
  PURPOSE:         calls Geoapify Places (https://api.geoapify.com/v2/places) with the key from .env
  FUNCTIONS:       searchPlaces(lat, lng, category, radiusMetres)
  DATA:            Geoapify uses lon,lat order in filter=circle:LON,LAT,R
                   there are no ratings (decision D6)
                   coverage is sparse, so try wider radii
  REVISE:          Wk 5 Axios GET with params + try/catch
  SAMPLE RESPONSE: fixtures/geoapify-malls-bishan.json
*/

// TODO (P2)
