/**
 * Created by Adrien on 8/31/2014.
 */
mongoose = require("mongoose");
var Picture = require('../model/picture');
mongoose.connect('mongodb://adrien:vinches@kahana.mongohq.com:10022/diogotest');
var db = mongoose.connection;



describe("Picture", function(){
    it("retrieves by email", function(done){
        customer.findByEmail('test@test.com', function(doc){
            doc.email.should.equal('test@test.com');
            done();
        });
    });
});
