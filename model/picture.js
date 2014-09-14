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
        county: { type: String, index:true },
        state: { type: String, index:true },
        postcode: { type: String },
        country: { type: String },
        country_code: { type: String, index:true }
    },
    url: { type: String },
    date: { type: Date, default: Date.now, index: true },
    userId: { type:Schema.Types.ObjectId, ref: 'User' },
    voteIds: { type:[{ type: Schema.Types.ObjectId, ref: 'Vote' }] }
});

module.exports = mongoose.model('Picture', PictureSchema);