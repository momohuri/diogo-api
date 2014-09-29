/**
 * Created by Adrien on 8/26/2014.
 */
var Schema = mongoose.Schema;

var TrendingPictureSchema = new Schema({
    location: {
        county: { type: String, index:true },
        state: { type: String, index:true },
        country: { type: String, index:true }
    },
    locationType: {type: String, index:true },
    date: { type: Date, default: Date.now },
    pictures: []
});

module.exports = mongoose.model('TrendingPicture', TrendingPictureSchema);