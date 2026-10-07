const Meetup = require('../models/meetup-model');

const generateRandomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

exports.getUniqueCode = async () => {
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    code = generateRandomCode();
    const existingMeetup = await Meetup.findByCode(code); 
    if (!existingMeetup) {
      isUnique = true;
    }
  }
  return code;
};