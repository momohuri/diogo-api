/**
 * Created by Adrien on 8/31/2014.
 */
mongoose = require("mongoose");
var Picture = require('../model/picture');
var User = require('../model/user');
var Controller = require("../controller/");
var should = require('should');
mongoose.connect('mongodb://adrien:vinches@kahana.mongohq.com:10082/diogotest');
var db = mongoose.connection;

var testData = require("./testData");

var user = testData.user;
var institution = testData.institution;
var picture = testData.picture;


describe('cleandb', function () {
    it("should clean DB", function (done) {
        User.find({username: user.username}).remove(function () {
            done()
        })
    })
});

//need to add more usecases...


describe('controller', function () {
    describe('signin', function () {
        it('signed in', function (done) {
            var request = {
                payload: user
            };
            Controller.signin(request, function (res) {
                res.success.should.equal(true);
                done();
            });
        });

        it('should not signed in (duplicate username)', function (done) {
            var request = {
                payload: user
            };
            Controller.signin(request, function (res) {
                res.success.should.equal(false);
                done();
            });
        });
    });

    describe('LogIn', function () {
        it('should logIn', function (done) {
            var request = {payload: user};
            Controller.login(request, function (res) {
                user.id = res.id;
                res.success.should.equal(true);
                done();
            });
        });
        it('should not logIn', function (done) {
            var request = {payload: user};
            request.payload.password = "nop";
            Controller.login(request, function (res) {
                res.success.should.equal(false);
                done();
            })

        });
    });

    describe("get user by UUID", function () {
        it("should give me a user", function (done) {
            Controller.getUserIdByUuid({payload: {uuid: user.uuid}}, function (user) {
                user.get('username').should.equal("momo");
                done();
            })
        })
    });
    describe("select a school", function () {
        it("should select an institution", function (done) {
            Controller.getUserIdByUuid({query: {uuid: user.uuid}}, function (pre) {
                var request = {
                    payload: institution, pre: {
                        user: pre
                    }
                };
                Controller.schoolSelected(request, function (res) {
                    res.success.should.equal(true);
                    done();
                })
            });
        });
    });
    describe("getPicture to vote", function () {
        it('respond with matching records', function (done) {
            Controller.getUserIdByUuid({query: {uuid: user.uuid}}, function (pre) {
                var request = {
                    payload: {
                        location: {
                            road: "232 carl street",
                            neighbourhood: "Cole Valley",
                            city: "San Francisco",
                            county: "San Francisco County",
                            state: "California",
                            postcode: "94117",
                            country: "United States of America",
                            country_code: "us"
                        },
                        uuid: "32EC0404-7B60-456F-AFD5-FE70FCFDCDEA"
                    },
                    pre: {
                        user: pre
                    }
                };
                Controller.getPicturesVote(request, function (res) {
                    res.should.have.length(5);
                    done();
                });
            });


        });
    });

    describe("upload a picture", function () {
        it("should upload a new picture", function (done) {

            cloudinary = require('cloudinary');
            cloudinary.config({
                cloud_name: 'diogo',
                api_key: '276795536938783',
                api_secret: 'kuN-419Ocb-RlmaOooDkolgz2YM'
            });

            Controller.getUserIdByUuid({query: {uuid: user.uuid}}, function (pre) {
                var request = {
                    picture: picture,
                    uuid:user.uuid
                };

                var stream = require('stream');
                var rs = {payload: new stream.Readable({objectMode: true})};
                rs.payload._read = function () {
                    rs.payload.push(JSON.stringify(request));
                    rs.payload.push(null);
                };
                rs.pre = {user: pre};


                Controller.uploadPicture(rs, function (res) {
                    res.success.should.equal(true);
                    done();
                })
            });
        });
    })
});






