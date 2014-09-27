/**
 * Created by Adrien on 8/26/2014.
 */
var Schema = mongoose.Schema;

var TempTrendingPictureSchema = new Schema({
    picId: { type: Schema.Types.ObjectId, ref: 'Picture'},
    location: {
        county: { type: String, index:true },
        state: { type: String, index:true },
        country_code: { type: String, index:true }
    },
    score: { type:Number}
});

module.exports = mongoose.model('TempTrendingPicture', TempTrendingPictureSchema);