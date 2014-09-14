/**
 * Created by Adrien on 8/26/2014.
 */
var Schema = mongoose.Schema;

var VoteSchema = new Schema({
    voteType: { type: Boolean, required: true},
    location: {
        road: { type: String },
        neighbourhood: { type: String },
        city: { type: String },
        county: { type: String },
        state: { type: String },
        postcode: { type: String },
        country: { type: String }
    },
    date: { type: Date, default: Date.now },
    userId: { type:{ type: Schema.Types.ObjectId, ref: 'User' } },
    pictureId: { type:{ type: Schema.Types.ObjectId, ref: 'Picture' } }

});

module.exports = mongoose.model('Vote', VoteSchema);