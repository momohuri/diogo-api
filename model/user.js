/**
 * Created by Adrien on 8/24/2014.
 */
var Schema = mongoose.Schema,
    crypto = require('crypto');
var UserSchema = new Schema({
    username: { type: String, required: true, index: { unique: true } },
    password: { type: String, required: true },
    points: {type: Number, default: 0 },
    uuid: {type: [String]},
    date: { type: Date, default: Date.now },
    voteIds: { type:[{ type: String, ref: 'Vote' }] },
    picsVoted: { type:[{ type: Schema.Types.ObjectId, index: true, ref: 'Picture' }] },
    picsSent: { type:[{ type: Schema.Types.ObjectId, index: true, ref: 'Picture' }] },
    pictureIds: { type:[{ type: Schema.Types.ObjectId, ref: 'Picture' }] }
});

UserSchema.pre('save', function(next) {
    var user = this;
    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();
    var shasum = crypto.createHash('sha1');
    shasum.update(user.password);
    user.password = shasum.digest('hex');
    next ();
});

UserSchema.statics = {
    comparePassword: function(password,passwordCandidate, next) {
        var shasum = crypto.createHash('sha1');
        shasum.update(passwordCandidate);
        candidatePasswordHash = shasum.digest('hex');
        return next(null, (candidatePasswordHash === password) ? true : false);
    }
};

module.exports = mongoose.model('User', UserSchema);