const express = require('express');

const router = express.Router();

router.get('/', function(req, res) {
    // console.log('new order page: ',req.session.user);
    let user = req.session.user;
    if (user) {
        res.render('newOrder', {
            warehouse: user.c_w_id,
            district: user.c_d_id,
            customer: user.c_id
        });
    }
    else {
        res.redirect('/login');
    }
});

module.exports = router;
