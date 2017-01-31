// Load modules

const Hapi = require("hapi");
const Hoek = require("hoek");
const Bell = require("bell");
const Controller = require("./controllers/index");
const mongoose = require('mongoose');

// mongoose.connect('mongodb://localhost/diogotest');
mongoose.connect('mongodb://diogo:123diogo45@ds137729.mlab.com:37729/diogo');


const server = new Hapi.Server();

const PORT = process.env.PORT || 8000;
server.connection({host: '0.0.0.0', port: PORT, routes: {cors: true}});

server.register(Bell, (err) => {

    Hoek.assert(!err, err);
    server.auth.strategy('facebook', 'bell', {
        provider: 'facebook',
        password: 'secretPwdNotForYou!#@!ewqQ#@!3213',
        isSecure: false,
        // You'll need to go to https://developers.facebook.com/ and set up a
        // Website application to get started
        // Once you create your app, fill out Settings and set the App Domains
        // Under Settings >> Advanced, set the Valid OAuth redirect URIs to include http://<yourdomain.com>/bell/door
        // and enable Client OAuth Login
        clientId: '1829718950616431',
        clientSecret: 'e112fe5bbe0af3d9b98bd337585e0ccd',
        location: server.info.uri
    });

    server.route([
        {
            method: '*',
            path: '/bell/door',
            config: {
                auth: {
                    strategy: 'facebook',
                    mode: 'try'
                },
                handler: function (request, reply) {
                    //todo implement that

                    if (!request.auth.isAuthenticated) {
                        return reply('Authentication failed due to: ' + request.auth.error.message);
                    }
                    reply('<pre>' + JSON.stringify(request.auth.credentials, null, 4) + '</pre>');
                }
            }
        }, {
            method: 'POST',
            path: '/login',
            handler: Controller.login
        },
        {
            method: 'POST',
            path: '/signin',
            handler: Controller.signin
        },
        {
            method: 'POST',
            path: '/signOut',
            config: {
                pre: [
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.signOut
            }
        },
        {
            method: 'POST',
            path: '/schoolSelected',
            config: {
                pre: [
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.schoolSelected
            }
        },
        {
            method: 'POST',
            path: '/uploadPicture',
            config: {
                pre: [{method: Controller.getUserIdByUsername, assign: 'user'}],
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
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.getPicturesVote
            }
        },
        {
            method: 'POST',
            path: '/vote',
            config: {
                pre: [
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.vote
            }
        },
        {
            method: 'POST',
            path: '/getTrendingPicture',
            config: {
                pre: [
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.getTrendingPicture
            }
        },
        {
            method: 'GET',
            path: '/getUserInfo',
            config: {
                pre: [
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.getUserInfo
            }
        },
        {
            method: 'POST',
            path: '/getTopOnePicture',
            config: {
                pre: [
                    {method: Controller.getUserIdByUsername, assign: 'user'}
                ],
                handler: Controller.getTopOnePicture
            }
        }]);

    server.start((err) => {
        Hoek.assert(!err, err);
        console.log('Server started at:', server.info.uri);
    });
});