/*
  FILE:            services/geoapify.js
  OWNER:           S (team-written)
  PURPOSE:         calls Geoapify Places (https://api.geoapify.com/v2/places) with the key from .env
  FUNCTIONS:       searchPlaces(lat, lng, category, radiusMetres) → array of Geoapify places
  DATA:            Geoapify uses lon,lat order in filter=circle:LON,LAT,R
                   there are no ratings (decision D6)
                   coverage is sparse, so try wider radii
  REVISE:          Wk 5 Axios GET with params + try/catch
  SAMPLE RESPONSE: fixtures/geoapify-malls-bishan.json
*/

const axios = require('axios');
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const API_KEY = process.env.GEOAPIFY_API_KEY;

exports.searchPlaces = async function (latitude, longitude, category, radiusMetres) {
  try {
    // TODO 1.1: build the params object: categories, filter, bias, limit, apiKey
    const params = {
      categories : category, 
      filter : `circle:${longitude},${latitude},${radiusMetres}`, 
      bias : `proximity:${longitude},${latitude}`, 
      limit : 20, 
      apiKey : API_KEY
    };
    // TODO 1.2: send it: const response = await axios.get(PLACES_URL, { params: ... })
    const response = await axios.get(PLACES_URL, {params : params });
    // TODO 1.3: return the places: response.data.features
    return response.data.features;
  } catch (error) {
    console.error('Geoapify request failed:', error.message);
    throw error;
  }
};
