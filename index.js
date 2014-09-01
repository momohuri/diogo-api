var Hapi = require('hapi');
mongoose = require('mongoose');
cloudinary = require('cloudinary');
var Controller = require('./controller');
var User = require('./model/user');
// Create a server with a host and port
var server = new Hapi.Server('0.0.0.0', 8000, {cors: true});

// Connection mongoose
mongoose.connect('mongodb://adrien:vinches@kahana.mongohq.com:10022/diogo');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
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
        path: '/getPictureVote',
        config: {
            pre: [{ method: Controller.getUserIdByUuid, assign: 'user' }],
            handler: Controller.getPicturesVote
        }
    }
]);


// Start the server
server.start();
console.log('server started');
