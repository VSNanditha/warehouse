const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/login', function(req, res) {
  res.render('index');
});

router.get('/', function(req, res) {
    res.render('index');
});

module.exports = router;
