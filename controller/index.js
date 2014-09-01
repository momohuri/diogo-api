/**
 * Created by Adrien on 8/24/2014.
 */
var Hapi = require('hapi'),
    User = require('../model/user'),
    Vote = require('../model/vote'),
    Picture = require('../model/picture');


exports.login = function (request, reply) {
    User.findOne({ username: request.payload.username }, function (err, userMatch) {
        if (err) reply(err, null);
        if (!userMatch) return reply({success:false, err:"UserName doesn't exist"});
        User.comparePassword(userMatch.password,request.payload.password, function (err, isMatch) {
            if(err) throw err;
            if (!isMatch) return reply({success:false, err:"Password does't match"});
            if (userMatch.uuid.indexOf(request.payload.uuid) == "-1") {
                userMatch.uuid.push(request.payload.uuid);
                userMatch.save(function (err, userUpdate) {
                    if(err) throw err;
                    if (!userUpdate) return reply({success:false, err:"error"});
                    return reply({id: userUpdate.id, success:true, msg:"New device"});
                });
            }
            return reply({id: userMatch.id, success:true});
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

function findPics(pictureIds, userLocation, loc, limit){
    Picture.find( { _id: { $nin: pictureIds }}).where('location.' + loc).equals(userLocation[loc]).sort({date: -1}).limit(limit).exec(function (err, docs) {
        if (err) throw err;
        return reply(docs);
    });
};

exports.getPicturesVote = function (request, reply) {
    var user = request.pre.user,
        location = request.payload.location,
        picturesToExclude = user.picsVoted.concat(user.picsSent),
        args = ['county','state','country_code'],
        pics = [],
        i = 0,
        limit = 5;
        while (pics.length < 5 && i < 3) {
            pics.concat(findPics(picturesToExclude, location, args[i], limit - pics.length));
            picturesToExclude.concat(
                pics.map(function (elem) {
                return elem._id;
                })
            );
        }
        user.picsSent.push(
            pics.map(function (elem) {
                return elem._id;
            })
        );
        reply(pics);
};