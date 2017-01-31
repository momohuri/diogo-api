mongoose = require("mongoose");
const Picture = require('../models/picture');
const User = require('../models/user');
const Controller = require("../controllers/");
const should = require('should');
mongoose.connect('mongodb://diogo:123diogo45@ds137729.mlab.com:37729/diogo');


const testData = require("./testData");

const users = testData.users;
const institution = testData.institution;
const pictures = testData.pictures;


describe('cleandb', function () {
    it("should clean DB", function (done) {
        User.find({username: users[0].username}).remove(function () {
            done()
        })
    })
});

//need to add more usecases...


describe('controller', function () {
    describe('signin', function () {
        it('signed in', function (done) {
            users.forEach((user) => {
                const request = {
                    payload: user
                };
                Controller.signin(request, function (res) {
                    res.success.should.equal(true);
                    done();
                });
            });

        });

        it('should not signed in (duplicate username)', function (done) {
            const request = {
                payload: users[0]
            };
            Controller.signin(request, function (res) {
                res.success.should.equal(false);
                done();
            });
        });
    });

    describe('LogIn', function () {
        it('should logIn', function (done) {
            const request = {payload: users[0]};
            Controller.login(request, function (res) {
                users[0].id = res.id;
                res.success.should.equal(true);
                done();
            });
        });
        it('should not logIn', function (done) {
            const request = {payload: users[0]};
            request.payload.password = "nop";
            Controller.login(request, function (res) {
                res.success.should.equal(false);
                done();
            })

        });
    });

    describe("get user by UUID", function () {
        it("should give me a user", function (done) {
            Controller.getUserIdByUuid({payload: {uuid: users[0].uuid}}, function (user) {
                user.get('username').should.equal("momo");
                done();
            })
        })
    });
    describe("select a school", function () {
        it("should select an institution", function (done) {
            Controller.getUserIdByUuid({query: {uuid: users[0].uuid}}, function (pre) {
                const request = {
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


    describe("upload a picture", function () {
        const uploaded_pictures = [];

        it("should upload a new picture", function (done) {
            cloudinary = require('cloudinary');
            cloudinary.config({
                cloud_name: 'diogo',
                api_key: '276795536938783',
                api_secret: 'kuN-419Ocb-RlmaOooDkolgz2YM'
            });

            Controller.getUserIdByUuid({query: {uuid: users[0].uuid}}, function (pre) {
                pictures.forEach((picture) => {
                    const request = {
                        picture: picture.picture,
                        uuid: users[0].uuid
                    };

                    const stream = require('stream');
                    const rs = {payload: new stream.Readable({objectMode: true})};
                    rs.payload._read = function () {
                        rs.payload.push(JSON.stringify(request));
                        rs.payload.push(null);
                    };
                    rs.pre = {user: pre};


                    Controller.uploadPicture(rs, function (res) {
                        res.success.should.equal(true);
                        uploaded_pictures.push(res.picture.id);
                        done();
                    })
                });

            });
        });

        it("should vote for pictures", function (done) {
            Controller.getUserIdByUsername({query: {username: users[1].username}}, (pre) => {
                uploaded_pictures.forEach((picture_id) => {
                    const request = {
                        pre: {user: pre},
                        payload: {
                            vote: {
                                voteType: true,
                                pictureId: picture_id,
                                "pictureLocation": {
                                    "city": "San Francisco",
                                    "state": "California",
                                    "country": "United States of America"
                                }
                            }
                        }
                    };
                    Controller.vote(request, (res) => {
                        res.success.should.equal(true);
                        done();
                    })
                });
            });
        });
    });


    describe("getPicture to vote", function () {
        it('respond with matching records', function (done) {
            Controller.getUserIdByUuid({query: {uuid: users[0].uuid}}, function (pre) {
                const request = {
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
});






