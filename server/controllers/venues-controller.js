// Returns venues near a point, in our own simple shape.

const { searchPlaces } = require('../services/geoapify');

const DEFAULT_CATEGORIES = 'catering.restaurant,catering.cafe,catering.food_court,commercial.shopping_mall';
const SEARCH_RADIUS_METRES = 1000;

exports.getVenues = async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const category = req.query.category || DEFAULT_CATEGORIES;

    if (!req.query.lat || !req.query.lng || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const places = await searchPlaces(latitude, longitude, category, SEARCH_RADIUS_METRES);

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
      });
    }

    res.json(venues);
  } catch (err) {
    console.error('Error getting venues:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
