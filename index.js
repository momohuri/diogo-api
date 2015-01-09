var Hapi = require('hapi');
mongoose = require('mongoose');
cloudinary = require('cloudinary');
var Controller = require('./controller');
var User = require('./model/user');
// Create a server with a host and port
var PORT = process.env.PORT || 8000;
var server = new Hapi.Server('0.0.0.0', PORT, {cors: true});

// Connection mongoose
//test
//mongoose.connect('mongodb://adrien:vinches@kahana.mongohq.com:10082/diogotest');
//dev
//
mongoose.connect('mongodb://adrien:vinches@kahana.mongohq.com:10022/diogo');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log('connection successfull');
});

// Connection Cloudinary
cloudinary.config({
    cloud_name: 'diogo',
    api_key: '276795536938783',
    api_secret: 'kuN-419Ocb-RlmaOooDkolgz2YM'
});

// Add the route
server.route([
    {
        method: 'POST',
        path: '/logIn',
        handler: Controller.login
    },
    {
        method: 'POST',
        path: '/signIn',
        handler: Controller.signin
    },
    {
        method: 'POST',
        path: '/signOut',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.signOut
        }
    },
    {
        method: 'POST',
        path: '/schoolSelected',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.schoolSelected
        }
    },
    {
        method: 'POST',
        path: '/uploadPicture',
        config: {
            // pre: [{ method: Controller.getUserIdByUuid, assign: 'user' }],
            handler: Controller.uploadPicture,
            payload: {
                maxBytes: 1048576 * 10, // 10MB
                output: 'stream',
                parse: true
            }
        }
    },
    {
        method: 'POST',
        path: '/getPicturesVote',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.getPicturesVote
        }
    },
    {
        method: 'POST',
        path: '/vote',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.vote
        }
    },
    {
        method: 'POST',
        path: '/getTrendingPicture',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.getTrendingPicture
        }
    },
    {
        method: 'GET',
        path: '/getUserInfo',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.getUserInfo
        }
    },
    {
        method: 'POST',
        path: '/getTopOnePicture',
        config: {
            pre: [
                {method: Controller.getUserIdByUuid, assign: 'user'}
            ],
            handler: Controller.getTopOnePicture
        }
    }
]);


// Start the server
server.start();
console.log('server started');
