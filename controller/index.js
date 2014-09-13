/**
 * Created by Adrien on 8/24/2014.
 */
var User = require('../model/user'),
    Vote = require('../model/vote'),
    Picture = require('../model/picture');

//todo make sure that the payload have : uuid, username and password
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
                getPics()
            }
        });
    }

    getPics();
};
