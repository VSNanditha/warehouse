const cassandra = require('cassandra-driver');
const express = require('express');

const router = express.Router();
const connect = new cassandra.Client({contactPoints: ['127.0.0.1'], keyspace: 'drug_warehouse'});

router.post('/', function(request, response) {
    let body = request.body;
    let username = body.email;
    let password = body.password;
    let postlets = {username: username, password: password};
    // fetching from CASSANDRA
    let query = 'SELECT * FROM customer where c_username = ? ALLOW FILTERING;';
    connect.execute(query,[username], function(err, result) {
        if(err) {
            response.send('<b>Database Connection Error</b>');
            throw err;
        }
        if(!result.rows.length) {
            console.log('No User');
            // request.session.message = 'Invalid User';
            // response.redirect('/login');
            response.send("Invalid User")
        }
        else {
            let passwordSuccess = 0;
            let user = result.rows[0];
            // console.log('user: ', user);
            if(JSON.stringify(user.c_password) === JSON.stringify(password)) {
                console.log('USER SUCCESS');
                passwordSuccess = 1;
            }
            else {
                passwordSuccess = 0;
            }
            if(passwordSuccess) {
                // console.log(request.session);
                request.session.user = user;
                // request.session.connect = connect;
                response.redirect('/home');
            }
            else {
                console.log('Wrong Password');
                response.send("Invalid Password")
            }
        }
    });
});

module.exports = router;
