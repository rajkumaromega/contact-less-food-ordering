/*
npm install ejs --save 
npm install express
npm i mysql
npm install express-session
npm install --save multer


*/

var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
const multer = require('multer');
const upload = multer({dest: __dirname + '/public/uploads/images'});

const QRCode = require('qrcode')


var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'nodelogin'
});

var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});

app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
				request.session.username = username;
				request.session.businessid = 0;

				let sql = 'select * from business WHERE username = ?';
				connection.query(sql, request.session.username, (error, [business], fields) => {
				if (error)
				{
					console.error(error.message);
				}
				else
				{
					if(business!=null)
					{
						console.log(business);
						request.session.businessid = business.id;
					}
					else
					{
						var sql = 'INSERT INTO business (username) values (?)';
						connection.query(sql, [username],function (err, data,fields) { 
							if (err) throw err;
							console.log("User dat is inserted successfully ");
							request.session.businessid = data.insertId;
							response.redirect('/home');
						});
					}
				}
				if(request.session.businessid>0)
				{
					response.redirect('/home');
				}
				});

				
			} else {
				response.send('Incorrect Username and/or Password!');
			}			
			//response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.get('/home', function(request, response) {
	if (request.session.loggedin) {
		response.render("home"); 
	} else {
		response.send('Please login to view this page!');
	}
	response.end();
});
app.get('/resturant', function(request, response) {
	if (request.session.loggedin) {
		console.log(request.session.businessid);
		let sql = 'select * from business WHERE username = ?';
		connection.query(sql, request.session.username, (error, [business], fields) => {
		if (error)
			console.error(error.message);
		console.log(business);
		response.render('resturant', { title: 'Table Edit', modelData: business});
		});
	} else {
		response.send('Please login to view this page!');
	}
	//response.end();
});
app.post('/save-resturant',upload.single('photo'), function(request, response, next) {
	const userDetails=request.body;
	console.log(request.session.businessid);
	var sql = 'update business SET title=?,description=?,image=? where id=?';
	connection.query(sql, [request.body.title,request.body.description,request.file.filename,request.session.businessid],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is updated successfully "); 
	});
	response.redirect('/resturant');  
  });
//Menu Items Section
app.get('/menuitems', function(request, response) {
	if (request.session.loggedin) {
		let id = request.query.id;
		var sql='SELECT * FROM menuitems where menuid=?';
		connection.query(sql,id, function (err, data, fields) {
		if (err) throw err;
		response.render('menuitems', { menuid: id, modelData: data});
		});
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/create-menuitems', function(request, response, next) { 
	let id = request.query.id;
	response.render('create-menuitems',{modelDatamenuid:id}); 
});
app.get('/delete-menuitems', function(request, response, next) { 
	let id = request.query.id;
	let menuid = request.query.menuid;
	if (request.session.loggedin) {
		let deletesql = 'delete from menuitems WHERE id = ?';
		connection.query(deletesql, id, (error, results, fields) => {
		if (error)
			console.error(error.message);
		console.log('Deleted Row(s):', results.affectedRows);
		});
		response.redirect('/menuitems?id='+menuid);
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/edit-menuitems', function(request, response, next) { 
	let id = request.query.id;
	if (request.session.loggedin) {
		let sql = 'select * from menuitems WHERE id = ?';
		connection.query(sql, id, (error, [tabledetails], fields) => {
		if (error)
			console.error(error.message);
		console.log(tabledetails);
		response.render('edit-menuitems', { title: 'Table Edit', modelData: tabledetails});
		});
	} else {
		response.send('Please login to view this page!');
	}
});
app.post('/save-menuitems',upload.single('photo'), function(request, response, next) {
	const userDetails=request.body;
	var sql = 'INSERT INTO menuitems (title,description,image,businessid,username,price,menuid)values(?,?,?,?,?,?,?)';
	connection.query(sql, [request.body.title,request.body.description,request.file.filename,request.session.businessid,request.session.username,request.body.price,request.body.menuid],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is inserted successfully "); 
	});
	response.redirect('/menuitems?id='+request.body.menuid); 
  }); 
  app.post('/update-menuitems',upload.single('photo'), function(request, response, next) {
	const userDetails=request.body;
	var filename = request.body.image;
	console.log(request.file);
	if(request.file != undefined )
	{
		filename = request.file.filename;
	}
	var sql = 'update menuitems SET title=?,description=?,image=?,price=?,menuid=? where id=?';
	connection.query(sql, [request.body.title,request.body.description,filename,request.body.price,request.body.menuid,request.body.id],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is updated successfully "); 
	});
	response.redirect('/menuitems?id='+request.body.menuid);  
  }); 


//Menus Section
app.get('/menu', function(request, response) {
	if (request.session.loggedin) {
		var sql='SELECT * FROM menus';
		connection.query(sql, function (err, data, fields) {
		if (err) throw err;
		response.render('menu', { title: 'Menu List', modelData: data});
		});
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/create-menu', function(request, response, next) { 
	response.render('create-menu'); 
});
app.get('/delete-menu', function(request, response, next) { 
	let id = request.query.id;
	if (request.session.loggedin) {
		let deletesql = 'delete from menus WHERE id = ?';
		connection.query(deletesql, id, (error, results, fields) => {
		if (error)
			console.error(error.message);
		console.log('Deleted Row(s):', results.affectedRows);
		});
		response.redirect('/menu');
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/edit-menu', function(request, response, next) { 
	let id = request.query.id;
	if (request.session.loggedin) {
		let sql = 'select * from menus WHERE id = ?';
		connection.query(sql, id, (error, [tabledetails], fields) => {
		if (error)
			console.error(error.message);
		console.log(tabledetails);
		response.render('edit-menu', { title: 'Table Edit', modelData: tabledetails});
		});
	} else {
		response.send('Please login to view this page!');
	}
});
app.post('/save-menu',upload.single('photo'), function(request, response, next) {
	const userDetails=request.body;
	var sql = 'INSERT INTO menus (title,description,image,businessid,username)values(?,?,?,?,?)';
	connection.query(sql, [request.body.title,request.body.description,request.file.filename,request.session.businessid,request.session.username],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is inserted successfully "); 
	});
	response.redirect('/menu'); 
  }); 
  app.post('/update-menu',upload.single('photo'), function(request, response, next) {
	const userDetails=request.body;
	var filename = request.body.image;
	console.log(request.file);
	if(request.file != undefined )
	{
		filename = request.file.filename;
	}
	var sql = 'update menus SET title=?,description=?,image=? where id=?';
	connection.query(sql, [request.body.title,request.body.description,filename,request.body.id],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is updated successfully "); 
	});
	response.redirect('/menu');  
  }); 

//Tables Section
app.get('/tables', function(request, response) {
	if (request.session.loggedin) {
		var sql='SELECT * FROM tabledetails';
		connection.query(sql, function (err, data, fields) {
		if (err) throw err;
		response.render('tables', { title: 'Table List', modelData: data});
		});
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/create-tables', function(request, response, next) { 
	response.render('create-tables'); 
});
app.get('/delete-table', function(request, response, next) { 
	let id = request.query.id;
	if (request.session.loggedin) {
		let deletesql = 'delete from tabledetails WHERE id = ?';
		connection.query(deletesql, id, (error, results, fields) => {
		if (error)
			console.error(error.message);
		console.log('Deleted Row(s):', results.affectedRows);
		});
		response.redirect('/tables');
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/edit-table', function(request, response, next) { 
	let id = request.query.id;
	if (request.session.loggedin) {
		let sql = 'select * from tabledetails WHERE id = ?';
		connection.query(sql, id, (error, [tabledetails], fields) => {
		if (error)
			console.error(error.message);
		console.log(tabledetails);
		response.render('edit-table', { title: 'Table Edit', modelData: tabledetails});
		});
	} else {
		response.send('Please login to view this page!');
	}
});
app.post('/save-table', function(request, response, next) {
	const userDetails=request.body;
	var sql = 'INSERT INTO tabledetails SET ?';
	connection.query(sql, userDetails,function (err, data) { 
		if (err) throw err;
		   console.log("User dat is inserted successfully "); 
	});
	response.redirect('/tables'); 
  }); 
  app.post('/update-table', function(request, response, next) {
	const userDetails=request.body;
	var sql = 'update tabledetails SET name=?,description=?,person=? where id=?';
	connection.query(sql, [request.body.name,request.body.description,request.body.person,request.body.id],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is updated successfully "); 
	});
	response.redirect('/tables');  
  }); 

app.get('/qrcode', function(request, response) {
	
	
app.get('/user-list', function(req, res, next) {
	var sql='SELECT * FROM users';
	db.query(sql, function (err, data, fields) {
	if (err) throw err;
	res.render('user-list', { title: 'User List', userData: data});
	});
});

 
// Print the QR code to terminal
//QRCode.toString(stringdata,{type:'terminal'},
  //                  function (err, QRcode) {
 
  //  if(err) return console.log("error occurred")
 
    // Printing the generated code
  //  console.log(QRcode)
//})
	
	
QRCode.toDataURL("stringdata", function (err, code) {
    if(err) return console.log("error occurred")
	response.render("qrcode", {imgdata:code}); 
});
	//response.end();
});




app.listen(3000);