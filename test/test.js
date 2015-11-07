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


describe('cleandb', function () {
    it("should clean DB", function (done) {
        User.find({username: "momo"}).remove(function () {
            done()
        })
    })
});

//need to add more usecases...

var user = {
    username: "momo",
    password: "myPWD",
    uuid: "12345"
};


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

});




