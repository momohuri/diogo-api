/**
 * Created by Adrien on 8/26/2014.
 */
var Schema = mongoose.Schema;

var PictureSchema = new Schema({
    name: { type: String, required: true},
    location: {
        road: { type: String },
        neighbourhood: { type: String },
        city: { type: String },
        county: { type: String },
        state: { type: String },
        postcode: { type: String },
        country: { type: String }
    },
    url: { type: String },
    date: { type: Date, default: Date.now },
    userId: { type:Schema.Types.ObjectId, ref: 'User' },
    voteIds: { type:[{ type: String, ref: 'Vote' }] }
});

module.exports = mongoose.model('Picture', PictureSchema);