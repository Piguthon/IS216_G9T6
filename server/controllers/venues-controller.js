/*
  FILE:      controllers/venues-controller.js
  OWNER:     S (team-written)
  PURPOSE:   returns venues near a point, in our own simple shape
  FUNCTIONS: getVenues (query lat, lng, category → array of Venue)
  DATA:      Venue { venueKey, name, address, lat, lng, category, distanceM, avgRating }
  TALKS TO:  services/geoapify.js
  DONE WHEN:
    - [ ] works in Postman
    - [ ] 400 on missing lat/lng
    - [ ] empty array when nothing is found
*/

const { searchPlaces } = require('../services/geoapify');

// Kinds of places FairSpot shows (Geoapify category names)
const DEFAULT_CATEGORIES = 'catering.restaurant,catering.cafe,catering.food_court,commercial.shopping_mall';
const SEARCH_RADIUS_METRES = 1000;

exports.getVenues = async (req, res) => {
  try {
    // 2.1: read the point and the categories from the query string (they arrive as text)
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const category = req.query.category || DEFAULT_CATEGORIES;

    // 2.2: missing, empty or non-number lat/lng → 400
    if (!req.query.lat || !req.query.lng || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // 2.3: ask Geoapify for places around the point
    const places = await searchPlaces(latitude, longitude, category, SEARCH_RADIUS_METRES);

    // 2.4: turn each Geoapify place into our Venue shape, skipping places without a name
    const wantedCategories = category.split(',');
    const venues = [];
    for (const place of places) {
      const details = place.properties;
      if (!details.name) {
        continue;
      }
      
      const placeCategories = details.categories || [];
      let venueCategory = null;
      for (const wanted of wantedCategories) {
        if (placeCategories.includes(wanted)) {
          venueCategory = wanted;
          break;
        }
      }

      venues.push({
        venueKey: details.place_id,
        name: details.name,
        address: details.address_line2,
        lat: details.lat,
        lng: details.lon,
        category: venueCategory,
        distanceM: details.distance,
        avgRating: null, 
      });
    }

    // 2.5: reply with the list (an empty list is a fine answer)
    res.json(venues);
  } catch (err) {
    console.error('Error getting venues:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
