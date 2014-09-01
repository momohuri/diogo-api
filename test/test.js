/**
 * Created by Adrien on 8/31/2014.
 */
mongoose = require("mongoose");
var Picture = require('../model/picture');
var Controller = require("../controller/");
mongoose.connect('mongodb://adrien:vinches@kahana.mongohq.com:10082/diogotest');
var db = mongoose.connection;



describe('Controller', function(){
    describe('getPicturesVote', function(){
        it('respond with matching records', function(done){
            var request = {
                payload : {
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
                    user: {
                        _id: "5403d8b04e338c1423575a9a",
                        date: "2014-09-01T02:23:44.718Z",
                        password: "5ed25af7b1ed23fb00122e13d7f74c4d8262acd8",
                        picsSent: [],
                        picsVoted: [],
                        pictureIds: [],
                        points: 0,
                        username: "adrien",
                        uuid: [
                        "32EC0404-7B60-456F-AFD5-FE70FCFDCDEA"
                        ],
                        voteIds: []
                    }
                }
            };
            console.log(request);
            Controller.getPicturesVote(request, function(res){
                console.log('coucou');
                res.should.have.length(5);
                done();
            });
        });
    });
});