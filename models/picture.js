const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//todo is there any use for storing vote ids here?
const PictureSchema = new Schema({
    name: {type: String},
    location: {
        road: {type: String},
        neighborhood: {type: String},
        city: {type: String},
        county: {type: String, index: true},
        state: {type: String, index: true},
        postcode: {type: String},
        country: {type: String},
        country_code: {type: String, index: true}
    },
    institution: {type: String},
    url: {type: String},
    date: {type: Date, default: Date.now, index: true},
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    voteIds: {type: [{type: Schema.Types.ObjectId, ref: 'Vote'}]}
});

module.exports = mongoose.model('Picture', PictureSchema);