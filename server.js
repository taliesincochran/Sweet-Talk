const express = require("express");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const path = require("path");
const favicon = require("serve-favicon");
const routes = require("./controllers/controller.js");
const db = require("./models");

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(favicon(__dirname + '/public/assets/img/favicon.ico'));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

require('./controllers/controller.js')(app, db, io);
db.sequelize.sync().then(()=>{
	server.listen(PORT, () => {
	  console.log(`Listening on PORT ${PORT}`);
	});
});
