/**
 * Created by Adrien on 8/26/2014.
 */
var Schema = mongoose.Schema;
var TrendingPictureSchema = new Schema({
    location: {type:String, index:true },
    date: { type: Date, default: Date.now },
    pictures: [{type: Object}]
});

module.exports = mongoose.model('TrendingPicture', TrendingPictureSchema);