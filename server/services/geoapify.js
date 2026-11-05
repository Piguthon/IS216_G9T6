// Calls Geoapify Places (https://api.geoapify.com/v2/places) with the key from .env.
// Sample response: sample-data/geoapify-malls-bishan.json

const axios = require('axios');
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const API_KEY = process.env.GEOAPIFY_API_KEY;

exports.searchPlaces = async function (latitude, longitude, category, radiusMetres) {
  try {
    const params = {
      categories : category, 
      filter : `circle:${longitude},${latitude},${radiusMetres}`, 
      bias : `proximity:${longitude},${latitude}`, 
      limit : 20, 
      apiKey : API_KEY
    };
    const response = await axios.get(PLACES_URL, {params : params });
    return response.data.features;
  } catch (error) {
    console.error('Geoapify request failed:', error.message);
    throw error;
  }
};
