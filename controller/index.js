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
    User.findOne({uuid: request.query.uuid}, function (err, doc) {
        if (err) throw err;
        return reply(doc);
    });
};


exports.getUserPoints = function (request, reply) {
    reply(request.pre.user.points);
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
            picsTemp = [];

            if (pics.length > 4 || i > 2) {
                pics.forEach(function (elem) {
                    user.picsSent.push(new ObjectId(elem._id));
                });
                user.save(function (err, doc) {
                    if (err) throw err;
                    return reply(pics);
                });
            }
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
        Picture.findByIdAndUpdate(vote.pictureId, { $push: { voteIds: picId }}, function (err, picture) {
            if (err) return reply({success: false, err: err.err});
            user.picsVoted.push(picture);
            user.picsSent.splice(user.picsSent.indexOf(new ObjectId(picture._id)), 1);
            user.points.$inc();
            user.save(function (err, doc) {
                if (err) return reply({success: false, err: err.err});
                return reply({success: true });
            });
        });
    });
};

function mapVote() {
    var score = 0,
        d = new ISODate(),
        dMinus6 = d.setHours(d.getHours() - 6),
        dMinus12 = d.setHours(d.getHours() - 6);

    if (this.voteType) {
        if (this.date > dMinus6) {
            score = 2;
        } else if (this.date > dMinus12) {
            score = 1;
        } else {
            score = 0.5;
        }
    } else {
        if (this.date > dMinus6) {
            score = -2;
        } else if (this.date > dMinus12) {
            score = -1;
        } else {
            score = -0.5;
        }
    }
    emit(this.pictureId, {score: score, location: this.location});
};

function reduceVote(pictureId, obj) {
    //return {score:Array.sum(obj.score),location:obj[0].location};
    var finalScore = obj.reduce(function (sum, item) {
        return sum.score + item.score;
    });
    return {score: finalScore, location: obj[0].location};
};

function populateTrendingPicture(trendingPics, location, next) {
    var trendingPicture = new TrendingPicture({
        location: location,
        pictures: trendingPics
    });

    TrendingPicture.remove({location: location}, function (err) {
        if (err) throw err;
        trendingPicture.save(function (err,doc) {
            if (err) throw err;
            next();
        });
    });
}

function mapReduceVote(loc, value) {
    var utils = {};
    utils.query = {};
    utils.query["location." + loc] = value;
    utils.map = mapVote;
    utils.reduce = reduceVote;
    utils.out = {merge: 'temp'};

    var location = value;
    var reduceMapCallbackQuery = {};
    reduceMapCallbackQuery["value.location." + loc] = value;

    Vote.mapReduce(utils, function (err, model, stats) {
        if (err) throw err;
        model.find(reduceMapCallbackQuery).sort({value: -1}).limit(50).exec(function (err, docs) {
            if (err) throw err;
            var tempTrendingPicsToSave = [];
            var i = 1;
            docs.forEach(function (item, index) {
                var picture = {};
                var rank = index;
                Picture.findOne({_id: item._id}, function (err, doc) {
                    if (err) throw err;
                    picture = doc;
                    picture._doc.score = item.value.score;
                    picture._doc.rank = ++rank;
                    tempTrendingPicsToSave.push(picture);
                    if (docs.length == i++) {
                        populateTrendingPicture(tempTrendingPicsToSave, location, function () {
                            model.remove(reduceMapCallbackQuery, function (err) {
                                if (err) throw err;
                            });
                        });
                    }
                });
            });
        });
    });
};


exports.getTrendingPicture = function (request, reply) {
    // Sent {uuid:uuid,location:location}
    var location = request.payload.location,
        results = [];
    console.log('county , ' + location.county);
    mapReduceVote('county', location.county);

    for (var loc in location) {
        if (location.hasOwnProperty(loc)) {
            //console.log(loc + ' / ' + location[loc]);
            //mapReduceVote(loc, location[loc]);
        }
    }
    /*TrendingPicture.findOne({location: location}, function (err, doc) {
     if (err) throw err;
     if (doc) {
     return reply(doc);
     } else {
     for (var loc in location) {
     if( location.hasOwnProperty( loc ) ) {
     results = mapReduceVote(loc,location[loc]);
     }
     }
     return reply([]);
     }
     });*/


};

exports.getTopTrendingPicture = function (request, reply) {
    // Sent {uuid:uuid,location:location}
    var location = request.payload.location,
        results = [];

    for (var loc in location) {
        if (location.hasOwnProperty(loc)) {
            var results = mapReduceVote(loc, location[loc], 50);
            console.log(results);
            reply(results);
        }
    }
};
