/**
 * Created by Adrien on 8/24/2014.
 */
var User = require('../model/user'),
    Vote = require('../model/vote'),
    Picture = require('../model/picture'),
    TrendingPicture = require('../model/trendingPicture'),
    ObjectId = require('mongoose').Types.ObjectId;


//todo make sure that the payload has : uuid, username and password
exports.login = function (request, reply) {
    User.findOne({ username: request.payload.username }, function (err, userMatch) {
        if (err) reply(err, null);
        if (!userMatch) return reply({success: false, err: "UserName doesn't exist"});
        User.comparePassword(userMatch.password, request.payload.password, function (err, isMatch) {
            if (err) throw err;
            if (!isMatch) return reply({success: false, err: "Password doesn't match"});
            if (userMatch.uuid.indexOf(request.payload.uuid) !== "-1") return reply({id: userMatch.id, success: true});
            else {
                userMatch.uuid.push(request.payload.uuid);
                userMatch.save(function (err, userUpdate) {
                    if (err) throw err;
                    if (!userUpdate) return reply({success: false, err: "error"});
                    return reply({id: userUpdate.id, success: true, msg: "New device"});
                });
            }
        });
    });
};
exports.signin = function (request, reply) {
    var user = new User({
        username: request.payload.username,
        password: request.payload.password,
        uuid: request.payload.uuid
    });
    user.save(function (err, data) {
        if (err) return reply({success: false, err: err.err});
        return reply({id: data._id, success: true});
    });
};

exports.upVote = function (request, reply) {

};

exports.uploadPicture = function (request, reply) {
    var user = request.pre.user
    var stream = '';
    request.payload.on('data', function (chunk) {
        stream += chunk;
    });

    request.payload.on('end', function (data) {

        var payload = JSON.parse(stream);
        var picture = new Picture(payload.picture);
        User.findOne({uuid: payload.uuid}, function (err, user) {
            if (err) throw err;
            picture.userId = user._id;
            cloudinary.uploader.upload(payload.picture.base64, function (result) {
                picture.url = result.url;
                picture.save(function (err, pic) {
                    if (err) return reply({success: false, err: err.err});
                    user.pictureIds.push(pic._id);
                    user.save(function (err, user) {
                        if (err) return reply({success: false, err: err.err});
                        return reply({success: true, picture: pic, user: user});
                    });
                });
            });
        });
    });
};

exports.getUserIdByUuid = function (request, reply) {
    User.findOne({uuid: request.payload.uuid}, function (err, doc) {
        if (err) throw err;
        return reply(doc);
    });
};

function findPics(pictureIds, userLocation, loc, limit, reply) {
    Picture.find({ _id: { $nin: pictureIds }}).where('location.' + loc).equals(userLocation[loc]).sort({date: -1}).limit(limit).exec(function (err, docs) {
        if (err) throw err;
        return reply(docs);
    });
}

exports.getPicturesVote = function (request, reply) {
    var user = request.pre.user,
        location = request.payload.location,
        picturesToExclude = [],
        args = ['county', 'state', 'country_code'],
        pics = [],
        i = 0,
        limit = 5;

    picturesToExclude = user.picsVoted.concat(user.picsSent, user.pictureIds);
    function getPics() {
        findPics(picturesToExclude, location, args[i], limit - pics.length, function (docs) {
            pics = pics.concat(docs);
            var picsTemp = pics.map(function (elem) {
                return elem._id;
            });
            picturesToExclude = picturesToExclude.concat(picsTemp);
            console.log('picsTemps');
            console.log(picsTemp);
            console.log("after");
            console.log(picturesToExclude);
            picsTemp = [];

            if (pics.length > 4 || i > 2) return reply(pics);
            else {
                i += 1;
                getPics();
            }
        });
    }

    getPics();
};

exports.vote = function (request, reply) {
    var picId = request.payload.vote.pictureId;
    var user = request.pre.user;
    var vote = new Vote(request.payload.vote);
    vote.userId = user._id;
    vote.pictureId = new ObjectId(picId);
    vote.save(function (err, voteSaved) {
        if (err) return reply({success: false, err: err.err});
        user.voteIds.push(voteSaved);
        Picture.findByIdAndUpdate(vote.pictureId, { $push: { voteIds: picId }}, function(err, picture) {
            if (err) return reply({success: false, err: err.err});
            user.picsVoted.push(picture);
            user.save(function (err, doc){
                if (err) return reply({success: false, err: err.err});
                return reply({success: true });
            });
        });
    });
};

function mapVote() {
    var score = 0,
        d = new Date(),
        dMinus6 = d.setHours(d.getHours() - 6),
        dMinus12 = d.setHours(d.getHours() - 12);

    if (this.voteType) {
        if (this.date > dMinus6) {
            score = 2;
        } else if (this.date > dMinus12){
            score = 1;
        } else {
            score = 5;
        }
    } else {
        if (this.date > dMinus6) {
            score = -2;
        } else if (this.date > dMinus12){
            score = -1;
        } else {
            score = -5;
        }
    }
    emit(this.pictureId, score);
};

function reduceVote(pictureId, voteScores) {
    return Array.sum(voteScores);
};

exports.getTrendingPicture = function (request, reply) {
    // Sent {uuid:uuid,location:location}


    var utils = {};
    utils.map = mapVote;
    utils.reduce = reduceVote;

    Vote.mapReduce(utils, function (err, results) {
        return reply(results);

    });


};
