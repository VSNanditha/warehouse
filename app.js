const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const session = require('express-session');

const indexRouter = require('./routes/index');
const validationRouter = require('./routes/validation');
const homeRouter = require('./routes/home');
const newOrderRouter = require('./routes/newOrder');
const orderValidationRouter = require('./routes/orderValidation');
const orderSuccessRouter = require('./routes/orderSuccess');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'warehouse'
}));

app.use('/', indexRouter);
app.use('/auth', validationRouter);
app.use('/home', homeRouter);
app.use('/home/newOrder', newOrderRouter);
app.use('/home/newOrder/orderValidation', orderValidationRouter);
app.use('/home/newOrder/orderSuccess', orderSuccessRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
