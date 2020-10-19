require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);
const io2 = require('./socket.js')(io)

// update express settings
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
app.use("/", require("./routes/get"));
app.use("/", require("./routes/post"));

app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// app.use("/", require("./routes/patch"));
// app.use("/", require("./routes/delete"));


app.use(express.static(__dirname + '/public'));

// catch all other routes
app.use((req, res, next) => {
  res.status(404).json({ message: '404 - Not Found' });
});

// handle errors
app.use((err, req, res, next) => {
  console.log(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${process.env.PORT || 3000}`);
});