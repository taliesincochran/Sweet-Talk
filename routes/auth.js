var express = require('express');
var sessions = require('express-session');
var io = require('socket.io');
const socketConnection = require('../controllers/socketConnection.js')
let currentUser = '';
module.exports = function(app, passport, db, io) {
 
    app.get('/api/create', function() {
    	console.log('api/create called')
    });
	app.post('/api/create', passport.authenticate('local-signup', 
		{
            successRedirect: '/api/signup/success',
            failureRedirect: '/api/signup/failure',
	    	failureFlash: true
        }
 
    ));
    app.get('/api/signup/failure',function(req,res) {
		res.send({error: "There has been an error in signup."});
    });
    app.get('/api/signup/success',function(req,res) {
    	console.log(req.user);
  		let {userName, password, gender, seeking, age, bio, img} = req.user;

		db.sequelize.define(userName, {
	    	id: {
	    		type: db.Sequelize.INTEGER,
	    		allowNull: false,
	    		primaryKey: true,
	    		autoIncrement: true
	    	},
	    	userName: {
	        	type: db.Sequelize.STRING,
		        allowNull: false,
		        validate:{
		            isAlphanumeric: true
		        }
		    },
		    swiped: {
		        type: db.Sequelize.BOOLEAN,
		        allowNull: false
		    }
	    }, {
	    	freezeTableName: true,
	    	timestamps: false,
	  	});

		db.User.update({online: 1}, {
			where: {
				userName
			}
		}).then(()=>{
		  	db.sequelize.sync().then(() => {
		    	res.json(req.user);
		  	}) ;
		});
    });

    app.post('/login', passport.authenticate('local-signin', 
    	{
	    	successRedirect: '/api/login/success',
	    	failureRedirect: '/api/login/failure',
	    	failureFlash: true
    	});
    );

    app.get('/api/login/failure',function(req,res) {
    	res.status(401);
    	
    });

    app.get('/api/login/success',function(req,res) {
    	currentUser = req.user
    	res.send(req.user);
    });

    app.get('/getSocket/:userName', function (req,res) {
    	let connected = socketConnection.getObj();
    	console.log('Firing after getObj:', req.params.userName)
    	let userSocket = connected[req.params.userName];
    	console.log('connected obj:', connected);
    	console.log('userSocket from backend:', userSocket);
    	res.send(userSocket)
    });

    app.get('/logout', function(req, res) { 
	    req.session.destroy(function(err) { 
    	db.User.update({online:0}, {
    		where: {
    			userName: req.user.userName
    		}
    	});

        res.redirect('/'); 

	    });
	});

    app.get('/userView', isLoggedIn, function(req,res) {
    	currentUser = req.user;
    	db.User.findAll({
		    where: {
		      gender: currentUser.seeking,
		      seeking: currentUser.gender,
		      online: 1
		    }
		}).then((results)=>{
		    var users = [];
		    for(var i = 0; i<results.length; i++) {
		      if(results[i].dataValues.userName !== currentUser.userName) {
		        users[i] = results[i].dataValues;
		      }
		    }
		    var handlebarsObject = {
		      currentUser: currentUser,
		      users: users,
		      title: req.user.userName
		    };
		    res.render("userview.handlebars", handlebarsObject);
    	})
    });

 	function isLoggedIn(req, res, next) {
	    if (req.isAuthenticated()) {
	        return next();	

	    }
	    res.status(200).send({});
	 
	}

	io.sockets.on("connection", (socket) => {
    		console.log('req.user.userName from before query:',currentUser.userName)
			
			db.sequelize.query(`INSERT INTO sockets (user, socketId) VALUES ('${currentUser.userName}', '${socket.id}');`);

    		socket.on('send message', function (message) {
				console.log('message from send message',message)
		    	db.sequelize.query(`SELECT socketId FROM sockets WHERE user="${message.to}";`)		
				.done((res) =>{
					console.log('res from query:',res)
					socket.to(res[0][0].socketId).emit('private message',message);
				});
    			
    		});

  			socket.on('disconnect', function(){
    			console.log('user disconnected');
    			db.sequelize.query(`DELETE FROM sockets WHERE user='${currentUser.userName}';`)
    			
  			});

    	});
}
