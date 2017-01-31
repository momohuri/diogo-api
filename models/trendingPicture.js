const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrendingPictureSchema = new Schema({
    location: {
        county: {type: String, index: true},
        state: {type: String, index: true},
        country: {type: String, index: true}
    },
    locationType: {type: String, index: true},
    date: {type: Date, default: Date.now},
    institution: {type: String, index: true},
    pictures: []
});

module.exports = mongoose.model('TrendingPicture', TrendingPictureSchema);