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


User.find({username: "momo"}).remove().exec();


//need to add more usecases...

var user = {
    username: "momo",
    password: "myPWD",
    uuid: "12345"
};
testSignIn()
    .then(testSignInDuplicate)
    .then(function () {
        debugger
    }).catch(console.log.bind(console));


//new Promise(function (resolve, reject) {
//    describe('signin', function () {
//        testSignIn()
//            .then(testSignInDuplicate)
//            .then(resolve)
//    })
//}).then(function () {
//    return new Promise(function (resolve) {
//        describe('logIn', function () {
//            testLogIn()
//                .then(testLogInWrongPassword())
//                .then(resolve)
//        })
//    })
//}).then(function () {
//    return new Promise(function (resolve, reject) {
//        describe('getPicturesVote', function () {
//            getPicturesVote()
//        })
//    })
//});


function testSignIn() {
    return new Promise(function (resolve, reject) {
        it('signed in', function (done) {
            var request = {
                payload: user
            };
            Controller.signin(request, function (res) {
                res.success.should.equal(true);
                done();
                resolve();
            });
        });
    })
}

function testSignInDuplicate() {
    return new Promise(function (resolve, reject) {
        it('should not signed in (duplicate username)', function (done) {
            var request = {
                payload: user
            };
            Controller.signin(request, function (res) {
                res.success.should.equal(false);
                resolve();
                done();
            });
        })
    });
}

function testLogIn() {
    return new Promise(function (resolve) {
        it('should logIn', function (done) {
            var request = {payload: user};
            Controller.login(request, function (res) {
                user.id = res.id;
                res.success.should.equal(true);
                resolve();
                done();
            })
        });
    });
}
function testLogInWrongPassword() {
    return new Promise(function (resolve, reject) {
        it('should not logIn', function (done) {
            var request = {payload: user};
            request.payload.password = "nop";
            Controller.login(request, function (res) {
                res.success.should.equal(false);
                resolve();
                done();
            })
        });
    });
}

function getPicturesVote() {
    return new Promise(function (resolve, reject) {
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
}







