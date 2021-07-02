/*
npm install ejs --save 
npm install express
npm i mysql
npm install express-session
npm install --save multer
npm install uuid
npm i upi-link
*/
var upiid="9417449138@upi";
var marchectid="RTjLNL00157999889753";//Install Googlepay Business or phone pay business to get marchent id. normal google pay will not give you marchent id
var websiteurl="http://192.168.43.237:3000/";
var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var uuid = require('uuid');
var path = require('path');
const multer = require('multer');
const upload = multer({dest: __dirname + '/public/uploads/images'});
const upi = require('upi-link');

var cartItems = [];
const QRCode = require('qrcode')


var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'nodelogin1'
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
app.get('/signup', function(request, response) {
	response.render("signup"); 
});
app.get('/makepayment', function(request, response) {
	var payment = request.query.id;
	
	//response.render("/"); 
});


app.post('/savesignup', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		var sql = 'INSERT INTO accounts (username,password,email)values(?,?,?)';
		connection.query(sql, [username,password,request.body.email],function (err, data) { 
			if (err) throw err;
			   console.log("User dat is inserted successfully ");
			   			sql = 'INSERT INTO business (username,status) values (?,?)';
						connection.query(sql, [username,0],function (err, data,fields) { 
							if (err) throw err;
							console.log("User dat is inserted successfully ");
							response.redirect('/');
						}); 
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});
app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, [accounts], fields) {
			if (accounts != null) {
				request.session.loggedin = true;
				request.session.username = username;
				request.session.businessid = 0;
				request.session.usertype = accounts.usertype;
				if(accounts.usertype=="admin")
				{
					return response.redirect('/adminhome');
				}

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
						var sql = 'INSERT INTO business (username,status) values (?,?)';
						connection.query(sql, [username,0],function (err, data,fields) { 
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
app.get('/adminhome', function(request, response) {
	if (request.session.loggedin) {
		response.render("adminhome"); 
	} else {
		response.send('Please login to view this page!');
	}
});
app.get('/allresturant', function(request, response) {
	if (request.session.loggedin) {
		console.log(request.session.businessid);
		let sql = 'select * from business';
		connection.query(sql, (error, business, fields) => {
		if (error)
			console.error(error.message);
	
			response.render('allresturant', { title: 'Table Edit', modelData: business});
		});
	} else {
		response.send('Please login to view this page!');
	}
	//response.end();
});
app.get('/rest-approve', function(request, response, next) {
	let id = request.query.id;
	console.log(request.session.businessid);
	var sql = 'update business SET status=1 where id=?';
	connection.query(sql, id,function (err, data) { 
		if (err) throw err;
		   console.log("User dat is updated successfully "); 
		   response.redirect('/allresturant');  
	});
	
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
		var sql='SELECT * FROM menus where username=?';
		connection.query(sql,request.session.username, function (err, data, fields) {
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
		var sql='SELECT * FROM tabledetails where businessid = ?';
		connection.query(sql,request.session.businessid, function (err, data, fields) {
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
	var sql = 'INSERT INTO tabledetails (name,description,person,businessid) values (?,?,?,?)';
	connection.query(sql, [request.body.name,request.body.description,request.body.person,request.session.businessid],function (err, data) { 
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
  function cleantable(tableid)
  {
	var sql='delete FROM cartitems where tableid=?';
	connection.query(sql,tableid, function (err, data) {
	if (err) throw err;
	//response.render('viewcart', { menuid: id, modelData: data});
	return 1;
	});
  }
  app.get('/place-order', function(request, response) {
	let id = request.session.cartid;
		var sql='SELECT * FROM cartitems where cartid=?';
		connection.query(sql,id, function (err, data, fields) {
		if (err) throw err;
		response.render('place-order', { menuid: id, modelData: data});
		});
  });
  app.post('/save-place-order', function(request, response, next) {
	const userDetails=request.body;
	var sql = 'INSERT INTO orders(status,businessid,address,name,contactno,tableno,cartid) values(?,?,?,?,?,?,?)';
	connection.query(sql, [1,request.session.bid,userDetails.address,userDetails.name,userDetails.contactno,request.session.tableid,request.session.cartid],function (err, data) { 
		if (err) throw err;
		   console.log("User dat is inserted successfully "); 
		   inserttoorderitems(request, response);
	});
	
  });
  
  function inserttoorderitems(request, response)
  {
	  console.log("Inside Insert");
	var sql='SELECT * FROM orders where cartid=? limit 1';
	connection.query(sql,request.session.cartid, function (err, [data], fields) {
	if (err) throw err;
	let id = request.session.cartid;
	console.log("order Selected");
		sql='SELECT * FROM cartitems where cartid=?';
		connection.query(sql,request.session.cartid, function (err, modelData, fields) {
		if (err) throw err;
		console.log("Inside cartitems");
		var payment = 0;
			modelData.forEach(function(itemdata) {
				//console.log(itemdata.name);
			
				payment= parseFloat(payment) + parseFloat(itemdata.totalprice);
			var inssql = 'INSERT INTO orderitems(title,description,image,unitprice,totalprice,qty,orderid,businessid) values(?,?,?,?,?,?,?,?)';
			connection.query(inssql, [itemdata.title,itemdata.description,itemdata.image,itemdata.unitprice,itemdata.totalprice,itemdata.qty,data.id,itemdata.businessid],function (err, data) { 
				if (err) throw err;
				   //console.log("User dat is inserted successfully "); 

				  
		
			});
			});
			cleantable(request.session.tableid);
			response.redirect('/payment?orderid='+data.id+'&payment='+payment); 

		});

	});
  }
  app.get('/payment', function(request, response) {
	let id = request.query.tid;
	let payment=request.query.payment;
	let uri = upi.Static(upiid, "Payment")
	.setMerchant(marchectid)
	.setMinAmount(payment)
	.setTxRef('INV001')
	.getLink()

console.log('URI:  ',uri);
	response.render('payment', { title: 'Menu List', payment: payment,orderid:id,link:uri});
  });
  app.get('/back-viewmenu', function(request, response) {
	response.redirect('/viewmenu?tid='+request.session.tableid+'&bid='+request.session.bid); 
  })
  app.get('/viewmenu', function(request, response) {
	let id = request.query.tid;
	let bid=request.query.bid;
	console.log(request.session.cartid);
	  if(request.session.cartid == undefined)
	  {
		
		request.session.cartid = uuid.v4();
		request.session.tableid = id;
		request.session.bid = bid;
		cleantable(id);
	  }
	
		var sql='SELECT * FROM menus where businessid='+bid;
		connection.query(sql, function (err, data, fields) {
		if (err) throw err;
		response.render('viewmenu', { title: 'Menu List', modelData: data});
		});
	});
app.get('/viewmenuitems', function(request, response) {
		let id = request.query.id;
		var sql='SELECT * FROM menuitems where menuid=?';
		connection.query(sql,id, function (err, data, fields) {
		if (err) throw err;
		response.render('viewmenuitems', { menuid: id, modelData: data});
		});
});

app.get('/orders', function(request, response) {
	let id = request.query.id;
	var sql='SELECT * FROM orders where businessid = ? order by id desc';
	console.log(request.session.businessid);
	connection.query(sql,request.session.businessid, function (err, data, fields) {
	if (err) throw err;
	response.render('orders', { menuid: id, modelData: data});
	});
});
app.get('/orders-items', function(request, response) {
	let id = request.query.id;
	var sql='SELECT * FROM orderitems where orderid = ?';
	console.log(request.session.businessid);
	connection.query(sql,id, function (err, data, fields) {
	if (err) throw err;
	response.render('orders-items', { menuid: id, modelData: data});
	});
});
app.get('/orders-done', function(request, response) {
	let id = request.query.id;
	var sql='update orders set status=2 where id = ?';
	console.log(request.session.businessid);
	connection.query(sql,id, function (err, data, fields) {
	if (err) throw err;
	response.redirect('/orders'); 
	});
});

app.get('/view-cart', function(request, response) {
	let id = request.session.cartid;
	
		var sql='SELECT * FROM cartitems where cartid=?';
		connection.query(sql,id, function (err, data, fields) {
		if (err) throw err;
		response.render('viewcart', { menuid: id, modelData: data});
		});
	});
	
	app.get('/update-cart-plus', function(request, response) {
		let id = request.query.id;
		let qty = parseInt(request.query.qty)+1;
		let price = parseFloat(request.query.price);
		let cartid = request.query.cartid;
		let totalprice = (qty * price);
			var sql='update cartitems set qty= ?, totalprice=? where id=?';
			connection.query(sql,[qty,totalprice,id], function (err, data) {
			if (err) throw err;
			response.redirect('/view-cart?id='+request.session.cartid); 
			});
		});
		app.get('/update-cart-min', function(request, response) {
			let id = request.query.id;
			let qty = parseInt(request.query.qty);
			if(qty>2)
			{
				qty = qty-1;
			}
			let price = parseFloat(request.query.price);
			let cartid = request.query.cartid;
			let totalprice = (qty * price);
				var sql='update cartitems set qty= ?, totalprice=? where id=?';
				connection.query(sql,[qty,totalprice,id], function (err, data) {
				if (err) throw err;
				response.redirect('/view-cart?id='+request.session.cartid); 
				});
			});
			app.get('/update-cart-delete', function(request, response) {
				let id = request.query.id;
					var sql='delete from cartitems where id=?';
					connection.query(sql,id, function (err, data) {
					if (err) throw err;
					response.redirect('/view-cart?id='+request.session.cartid); 
					});
				});
app.get('/addto-cart', function(request, response) {
console.log(request.session.cartid);
	let id = request.query.id;
	//let bid=request.query.bid;
	var sql='SELECT * FROM cartitems where cartid=? and itemid=?';
		connection.query(sql,[id,request.session.cartid], function (err, [cartitems], fields) {
		if (err) throw err;
		console.log(cartitems);
		if(cartitems==null){
			var sql='SELECT * FROM menuitems where id=?';
			connection.query(sql,id, function (err, [menuitems], fields) {
			if (err) throw err;
			{
				sql = 'INSERT INTO cartitems (title,description,image,unitprice,totalprice,discount,qty,businessid,cartid,isplaced,tableid,itemid)values(?,?,?,?,?,?,?,?,?,?,?,?)';
				connection.query(sql, [menuitems.title,menuitems.description,menuitems.image,menuitems.price,menuitems.price,0,1,menuitems.businessid,request.session.cartid,0,request.session.tableid,menuitems.id],function (err, data) { 
					if (err) throw err;
					console.log("User dat is inserted successfully "); 
					response.redirect('/view-cart?id='+request.session.cartid); 
				});
			}
			});
		}
		});
		console.log(cartItems);
		
});	
	
app.get('/user-list', function(req, res, next) {
	var sql='SELECT * FROM users';
	db.query(sql, function (err, data, fields) {
	if (err) throw err;
	res.render('user-list', { title: 'User List', userData: data});
	});
});
app.get('/logout', function(request, response) {
	request.session.loggedin=false;
	response.redirect('/'); 
	});
app.get('/qrcode', function(request, response) {
// Print the QR code to terminal
//QRCode.toString(stringdata,{type:'terminal'},
  //                  function (err, QRcode) {
 
  //  if(err) return console.log("error occurred")
 
    // Printing the generated code
  //  console.log(QRcode)
//})
	
let id = request.query.id;
let bid=request.session.businessid;
console.log(request.baseUrl);
	if (request.session.loggedin) {	
		var dataurl = websiteurl + "viewmenu?bid="+bid+"&tid="+id;
QRCode.toDataURL(dataurl, function (err, code) {
    if(err) return console.log("error occurred")
	response.render("qrcode", {imgdata:code,business:bid,table:id}); 
});
} else {
	response.send('Please login to view this page!');
}
	//response.end();
});




app.listen(3000);