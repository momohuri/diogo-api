const crypto = require('crypto');
const User = require('../models/user'),
    Vote = require('../models/vote'),
    Picture = require('../models/picture'),
    TrendingPicture = require('../models/trendingPicture'),
    ObjectId = require('mongoose').Types.ObjectId;


//todo make sure that the payload has : uuid, username and password
exports.login = function (request, reply) {
    User.findOne({username: request.payload.username}, function (err, userMatch) {
        if (err) reply(err, null);
        if (!userMatch) return reply({success: false, err: "username doesn't exist"});
        User.comparePassword(userMatch.password, request.payload.password, function (err, isMatch) {
            if (err) throw err;
            if (!isMatch) return reply({success: false, err: "password doesn't match"});
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
    const user = new User({
        username: request.payload.username,
        password: request.payload.password,
        uuid: request.payload.uuid
    });
    user.save(function (err, data) {
        if (err) return reply({success: false, err: "username already exists"});
        return reply({id: data._id, success: true});
    });
};
exports.signOut = function (request, reply) {
    return reply();
}; //todo this function  (remove uuid from user?)

exports.getUserIdByUuid = function (request, reply) {
    const uuid = request.query ? request.query.uuid : request.payload.uuid;
    User.findOne({uuid: uuid}).select('-password').exec(function (err, doc) {
        if (err) throw err;
        if (!doc)return reply({"success": false, "error": "UUID unknown"});
        return reply(doc);
    });
};

exports.getUserIdByUsername = function (request, reply) {
    const username = request.query.username ? request.query.username : request.payload.username;
    User.findOne({username: username}).select('-password').exec(function (err, doc) {
        if (err) throw err;
        if (!doc)return reply({"success": false, "error": "username unknown"});
        return reply(doc);
    });
};


exports.schoolSelected = function (request, reply) {
    request.pre.user.set('institution', request.payload.institution);
    request.pre.user.save(function (err, user) {
        if (err) throw err;
        reply({success: true})
    })
};

exports.uploadPicture = function (request, reply) {
    const user = request.pre.user;
    let stream = '';
    request.payload.on('data', function (chunk) {
        stream += chunk;
    });

    request.payload.on('end', function (data) {
        const payload = JSON.parse(stream);
        const picture = new Picture(payload.picture);
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


function findPics(pictureIds, userLocation, loc, limit, reply) {
    //todo populate userid is cool but there is to much info  (should remove more than just password)
    Picture.find({_id: {$nin: pictureIds}}).populate('userId', 'username').where('location.' + loc).equals(userLocation[loc]).sort({date: -1}).limit(limit).exec(function (err, docs) {
        if (err) throw err;
        return reply(docs);
    });
}

//todo add pictures from institution
exports.getPicturesVote = function (request, reply) {
    const user = request.pre.user,
        location = request.payload.location,
        args = ['city', 'state', 'country'],
        limit = 5;
    let pics = [], picturesToExclude = [], i = 0;
    //got the error message from the pre.
    if (user.error)return reply(user);
    picturesToExclude = user.picsVoted.concat(user.picsSent, user.pictureIds);
    function getPics() {
        findPics(picturesToExclude, location, args[i], limit - pics.length, function (docs) {
            pics = pics.concat(docs);
            const picsTemp = pics.map(function (elem) {
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
    const picId = request.payload.vote.pictureId;
    const user = request.pre.user;
    let vote = request.payload.vote;
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
    } else {
        //if user never voted
        const vote_instance = new Vote(vote);
        vote_instance.set('userId', user._id);
        vote_instance.set('pictureId', new ObjectId(picId));
        vote_instance.set('userInstitution', user.get('institution'));
        vote_instance.save((err, voteSaved) => {
            if (err) return reply({success: false, err: err.err});
            user.voteIds.push(voteSaved);
            Picture.findByIdAndUpdate(vote.pictureId, {$push: {voteIds: picId}}, (err, picture) => {
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

function mapVote() {
    var score = 0,
        d = new Date(),
        dMinus6 = d.setHours(d.getHours() - 6),
        dMinus12 = d.setHours(d.getHours() - 12);

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
    emit(this.pictureId, {score: score, location: this.pictureLocation});
}

function reduceVote(pictureId, obj) {
    //return {score:Array.sum(obj.score),location:obj[0].location};
    var finalScore = 0;
    obj.reduce(function (sum, item) {
        finalScore += item.score;
    });
    if (isNaN(finalScore)) finalScore = 0;
    return {score: finalScore, location: obj[0].location};
}

function populateTrendingPicture(trendingPics, location, locationType, next) {

    const trendingPicture = new TrendingPicture({
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
    const utils = {};
    const reduceMapCallbackQuery = {};

    utils.query = {};
    if (locationType == 'institution') {
        utils.query['userInstitution'] = location;
        utils.query['pictureInstitution'] = location;
        reduceMapCallbackQuery["value.institution"] = location;
    } else {
        for (const key in location) {
            utils.query['pictureLocation.' + key] = location[key];
            reduceMapCallbackQuery["value.location." + key] = location[key];
        }
    }

    utils.map = mapVote;
    utils.reduce = reduceVote;
    const collectionName = crypto.createHash('md5').update('tempMapR-' + JSON.stringify(location)).digest('hex');
    utils.out = {replace: collectionName};
    //todo find a way of making this a singleton. (if multi-threading)
    Vote.mapReduce(utils, function (err, model, stats) {
        if (err) throw err;
        model.find(reduceMapCallbackQuery).sort({'value.score': -1}).limit(50).exec(function (err, docs) {
            if (err) throw err;
            let tempTrendingPicsToSave = [];
            let i = 1;
            docs.forEach(function (item) {
                Picture.findOne({_id: item._id}).select('-userId.password').exec(function (err, doc) {
                    if (err) throw err;
                    if (doc) { //bug happend here were picture got deleted
                        const picture = doc;
                        picture._doc.score = item.value.score;
                        tempTrendingPicsToSave.push(picture);
                    }
                    if (docs.length == i++) {
                        tempTrendingPicsToSave = tempTrendingPicsToSave.sort(function (a, b) {
                            return b._doc.score - a._doc.score
                        });
                        tempTrendingPicsToSave.forEach(function (a, i) {
                            a.rank = i + 1;
                        });
                        populateTrendingPicture(tempTrendingPicsToSave, location, locationType, function () {
                            Picture.db.db.dropCollection.dropCollection(collectionName, function (err, result) {
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
    const location = request.payload.location,
        user = request.pre.user,
        results = {},
        i = 0,
        d = new Date(),
        dMinus6 = d.setHours(d.getHours() - 6),
        order = ['county', 'state', 'country'];
    if (request.pre.user.institution) order.push('institution');
    order.forEach(function (elem, key, array) {
        const type = elem;
        let loc;
        try {
            if (type !== 'institution') loc = JSON.parse(JSON.stringify(location));
            else loc = user.get('institution')
        } catch (e) {
            console.log('location not found?', e);
            console.log('location:', location);
            debugger
        }

        const query = {};
        for (const key in location) {
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

//todo why get top one and gettrending are so different? refactorise
exports.getTrendingPicture = function (request, reply) {
    // Sent {uuid:uuid,location:location,type:type}
    let location = request.payload.location,
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
    }
    if (type != 'institution') {
        for (const key in loc) query['location.' + key] = loc[key];
    } else if (type == 'institution') {
        query['institution'] = request.payload.institution;
    }

    query.locationType = type;

    TrendingPicture.findOne(query).exec(function (err, doc) {
        if (err) throw err;
        if (doc) {
            let i = 0;
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
    const user = request.pre.user;
    user.set('picsSent', user.get('picsSent').length, Number);  //don t really need this one
    user.set('picsVoted', user.get('picsVoted').length, Number);
    user.set('pictureIds', user.get('pictureIds').length, Number);
    user.set('voteIds', user.get('voteIds').length, Number);
    delete user._doc.uuid;
    delete user._doc._id;
    reply(user)
};