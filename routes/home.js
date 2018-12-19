const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    // console.log('home page: ',req.session.user);
    if (req.session.user) {
        res.render('home');
    }
    else {
        res.redirect('/login');
    }
});

module.exports = router;
