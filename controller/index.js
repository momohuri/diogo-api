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
    User.findOne({username: request.payload.username}, function (err, userMatch) {
        if (err) reply(err, null);
        if (!userMatch) return reply({success: false, err: "UserName doesn't exist"});
        User.comparePassword(userMatch.password, request.payload.password, function (err, isMatch) {
            if (err) throw err;
            if (!isMatch) return reply({success: false, err: "Password doesn't match"});
            if (userMatch.uuid.indexOf(request.payload.uuid) !== -1) return reply({id: userMatch.id, success: true});
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
exports.signOut = function (request, reply) {
    return reply();
}; //todo this function  (remove uuid from user?)

exports.schoolSelected = function (request, reply) {
    request.pre.user.set('institution', request.payload.institution);
    request.pre.user.save(function (err, user) {
        if (err) throw err;
        reply({success: true})
    })
};

exports.uploadPicture = function (request, reply) {
    var user = request.pre.user;
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
                if (user.institution) picture.institution = user.institution;
                picture.save(function (err, pic) {
                    if (err) return reply({success: false, err: err});
                    user.pictureIds.push(pic._id);
                    user.save(function (err, user) {
                        if (err) return reply({success: false, err: err});
                        return reply({success: true, picture: pic, user: user});
                    });
                });
            });
        });
    });
};

exports.getUserIdByUuid = function (request, reply) {
    User.findOne({uuid: request.query.uuid}).select('-password').exec(function (err, doc) {
        if (err) throw err;
        return reply(doc);
    });
};


function findPics(pictureIds, userLocation, loc, limit, reply) {
    //todo populate userid is cool but there is to much info  (should remove more than just password)
    Picture.find({_id: {$nin: pictureIds}}).populate('userId').select('-userId.password').where('location.' + loc).equals(userLocation[loc]).sort({date: -1}).limit(limit).exec(function (err, docs) {
        if (err) throw err;
        return reply(docs);
    });
}

//todo add pictures from school
exports.getPicturesVote = function (request, reply) {
    var user = request.pre.user,
        location = request.payload.location,
        picturesToExclude = [],
        args = ['county', 'state', 'country'],
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
    var vote = request.payload.vote;
    if (user.picsVoted.indexOf(picId) !== -1) {             //if user already voted
        Vote.findOne({pictureId: new ObjectId(picId), userId: user._id}, function (err, doc) {
            if (err) throw err;
            doc.set('voteType', vote.voteType);
            doc.set('location', vote.location);
            doc.save(function (err, voteSaved) {
                if (err) throw err;
                return reply({success: true});
            });
        })
    } else {                                              //if user never voted
        vote = new Vote(vote);
        vote.set('userId', user._id);
        vote.set('pictureId', new ObjectId(picId));
        vote.set('userInstitution', user.get('institution'));
        vote.save(function (err, voteSaved) {
            if (err) return reply({success: false, err: err.err});
            user.voteIds.push(voteSaved);
            Picture.findByIdAndUpdate(vote.pictureId, {$push: {voteIds: picId}}, function (err, picture) {
                if (err) return reply({success: false, err: err.err});
                user.picsVoted.push(picture);
                if (user.picsSent.indexOf(new ObjectId(picture._id)) !== -1) {//if we voted from the trending page
                    user.picsSent.splice(user.picsSent.indexOf(new ObjectId(picture._id)), 1);
                }
                ++user.points;
                user.save(function (err, doc) {
                    if (err) return reply({success: false, err: err.err});
                    return reply({success: true});
                });
            });
        });
    }
};

//todo should put 0 if thereis no vote
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
    emit(this.pictureId, {score: score, location: this.location, institution: this.userInstitution});
}

function reduceVote(pictureId, obj) {
    //return {score:Array.sum(obj.score),location:obj[0].location};
    var finalScore = 0;
    obj.reduce(function (sum, item) {
        finalScore += item.score;
    });
    if (isNaN(finalScore)) finalScore = 0;
    return {score: finalScore, location: obj[0].location, institution: obj[0].institution};
}

function populateTrendingPicture(trendingPics, location, locationType, next) {


    var trendingPicture = new TrendingPicture({
        locationType: locationType,
        pictures: trendingPics
    });

    if (typeof location == 'string') trendingPicture.institution = location;
    else trendingPicture.location = location;

    TrendingPicture.remove({location: location, locationType: locationType}, function (err) {
        if (err) throw err;
        trendingPicture.save(function (err, doc) {
            if (err) throw err;
            next();
        });
    });
}

function mapReduceVote(locationType, location) {
    var utils = {};
    var reduceMapCallbackQuery = {};

    utils.query = {};
    if (locationType == 'institution') {
        utils.query['userInstitution'] = location;
        utils.query['pictureInstitution'] = location;
        reduceMapCallbackQuery["value.institution"] = location;
    } else {
        for (var key in location) {
            utils.query['location.' + key] = location[key];
            utils.query['pictureLocation.' + key] = location[key];
            reduceMapCallbackQuery["value.location." + key] = location[key];
        }
    }

    utils.map = mapVote;
    utils.reduce = reduceVote;
    utils.out = {merge: 'temp'};

    Vote.mapReduce(utils, function (err, model, stats) {
        if (err) throw err;
        model.find(reduceMapCallbackQuery).sort({'value.score': -1}).limit(50).exec(function (err, docs) {
            if (err) throw err;
            var tempTrendingPicsToSave = [];
            var i = 1;
            docs.forEach(function (item) {
                var picture = {};
                Picture.findOne({_id: item._id}).populate('userId').select('-userId.password').exec(function (err, doc) {
                    if (err) throw err;
                    if (doc) { //bug happend here were picture got deleted
                        picture = doc;
                        picture._doc.userId = picture.get('userId').toJSON();
                        picture.score = item.value.score;
                        tempTrendingPicsToSave.push(picture);
                    }
                    if (docs.length == i++) {
                        tempTrendingPicsToSave = tempTrendingPicsToSave.sort(function (a, b) {
                            return b._doc.score - a._doc.score
                        });
                        tempTrendingPicsToSave.map(function (a, i) {
                            a.rank = i + 1;
                        });
                        populateTrendingPicture(tempTrendingPicsToSave, location, locationType, function () {
                            model.remove(reduceMapCallbackQuery, function (err) {
                                if (err) throw err;
                            });
                        });
                    }
                });
            });
        });
    });
}


exports.getTopOnePicture = function (request, reply) {
    var location = request.payload.location,
        user = request.pre.user,
        results = {},
        i = 0,
        d = new Date(),
        dMinus6 = d.setHours(d.getHours() - 6),
        order = ['county', 'state', 'country'];
    if (request.pre.user.institution) order.push('institution');
    order.forEach(function (elem, key, array) {
        var type = elem,
            loc;
        try {
            if (type !== 'institution') loc = JSON.parse(JSON.stringify(location));
            else loc = user.get('institution')
        } catch (e) {
            console.log('location not found?', e);
            console.log('location:', location);
            debugger
        }

        var query = {};
        for (var key in location) {
            query['location.' + key] = location[key];
        }
        query.locationType = type;
        if (type === 'institution') query['institution'] = request.pre.user.institution;


        TrendingPicture.findOne(query, function (err, doc) {
            if (err) throw err;
            if (doc) {
                doc.pictures = doc.pictures.sort(function (a, b) {
                    return a.rank - b.rank;
                });
                results[type] = {
                    name: loc[type] || loc,
                    picture: doc.pictures[0].url,
                    score: doc.pictures[0].score
                };
                if (array.length == ++i) {
                    reply(results);
                }
                if (doc.date < dMinus6) {
                    mapReduceVote(type, loc);
                }
            } else {
                //if no picture avaible,
                results[type] = {
                    name: loc[type]
                };
                if (array.length == ++i) reply(results);
                mapReduceVote(type, loc);
            }
        });
        delete location[type];
    });
};

exports.getTrendingPicture = function (request, reply) {
    // Sent {uuid:uuid,location:location,type:type}
    var location = request.payload.location,
        type = request.payload.type,
        loc = {},
        query = {},
        d = new Date(),
        dMinus6 = d.setMinutes(d.getMinutes() - 5);         //changed to 5 minutes

    if (type == 'county') {
        loc = location;
    } else if (type == 'state') {
        delete location['county'];
        loc = location;
    } else if (type == 'country') {
        delete location['county'];
        delete location['state'];
        loc = location;
    } else if (type == 'school') {
        loc = {'institution': request.pre.user.institution};
    }
    for (var key in loc) {
        query['location.' + key] = loc[key];
    }
    query.locationType = type;

    TrendingPicture.findOne(query).exec(function (err, doc) {
        if (err) throw err;
        if (doc) {
            var i = 0;
            doc.pictures.forEach(function (picture) {
                ++i;
                if (request.pre.user.picsVoted.indexOf(picture._id) !== -1) {
                    Vote.findOne({pictureId: picture._id, userId: request.pre.user._id}, function (err, doc) {
                        if (err) throw err;
                        picture.vote = doc.voteType;
                        if (--i == 0) next();
                    })
                } else if (--i == 0) next();
            });
            function next() {
                reply(doc);
                if (doc.date < dMinus6) {
                    mapReduceVote(type, location);
                }
            }
        } else {
            reply({});
            mapReduceVote(type, location);
        }
    })
};

exports.getUserInfo = function (request, reply) {
    var user = request.pre.user;
    user.set('picsSent', user.get('picsSent').length, Number);  //don t really need this one
    user.set('picsVoted', user.get('picsVoted').length, Number);
    user.set('pictureIds', user.get('pictureIds').length, Number);
    user.set('voteIds', user.get('voteIds').length, Number);
    delete user._doc.uuid;
    delete user._doc._id;
    reply(user)
};