const express = require('express');
const app = express();
var mysql = require('mysql');
const bcrypt = require('bcrypt');
const conInfo = 
{
    host: process.env.IP,
    user: process.env.C9_USER,
    password: '',
    database: 'USERDB'
};
var session = require('express-session');

app.use(session({ secret: 'server side', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}));

app.all('/', whoIsLoggedIn);
app.all('/register', register);
app.all('/login', login);
app.all('/logout', logout);
app.all('/listSongs', listSongs);
app.all('/addSong', addSong);
app.all('/removeSong', removeSong);
app.all('/clearSongs', clearSongs);
app.listen(process.env.PORT, process.env.IP, startHandler);

function startHandler()
{
    console.log('Server listening on port ' + process.env.PORT);
}

function whoIsLoggedIn(req, res)
{
    if(req.session.user == undefined)
        writeResult(req, res, {'result' : 'No one is logged in'});
    else
         writeResult(req, res, {'result' : req.session.user});
}

function register(req, res)
{
    if (req.query.email == undefined || !validateEmail(req.query.email))
    {
        writeResult(req, res, {'error' : "Please specify a valid email"});
        return;
    }

    if (req.query.password == undefined || !validatePassword(req.query.password))
    {
        writeResult(req, res, {'error' : "Password must have eight characters, at least one letter and one number"});
        return;
    }

    var con = mysql.createConnection(conInfo);
    con.connect(function(err) 
    {
        if (err) 
            writeResult(req, res, {'error' : err});
        else
        {
            let hash = bcrypt.hashSync(req.query.password, 12);
            con.query("INSERT INTO USER (USER_EMAIL, USER_PASS) VALUES (?, ?)", [req.query.email, hash], function (err, result, fields) 
            {
                if (err) 
                {
                    if (err.code == "ER_DUP_ENTRY")
                        err = "User account already exists.";
                    writeResult(req, res, {'error' : err});
                }
                else
                {
                    con.query("SELECT * FROM USER WHERE USER_EMAIL = (?)", [req.query.email], function (err, result, fields) 
                    {
                        if (err) 
                            writeResult(req, res, {'error' : err});
                        else
                        {
                            req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
                            writeResult(req, res, req.session.user);
                        }
                    });
                }
            });
        }
    });
  
}

function login(req, res)
{
    
    if(req.query.email == undefined)
    {
        writeResult(req, res, {'error' : 'Email must be entered'});
        return;
    }
    
    if(req.query.password == undefined)
    {
        writeResult(req, res, {'error' : 'Password must be entered'});
        return;
    }
    
    var con = mysql.createConnection(conInfo);
    con.connect(function(err)
    {
        if(err)
            writeResult(req, res, {'error' : err});
        else
        {
            con.query('SELECT * FROM USER WHERE USER_EMAIL = (?)', [req.query.email], function(err, result, fields)
            {
                if(err)
                    writeResult(req, res, {'error' : err});
                else
                {
                    if(result.length == 1 && bcrypt.compareSync(req.query.password, result[0].USER_PASS))
                    {
                        req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
                        writeResult(req, res, req.session.user);
                    }
                    else
                    {
                        writeResult(req, res, {'error': "Invalid email/password"});
                    }
                }
            });
        }
    });
}

function logout(req, res)
{
    req.session.user = undefined;
    writeResult(req, res, {'error' : 'No one is logged in'});
}

function listSongs(req, res)
{
    if(req.session.user == undefined)
        writeResult(req, res, {'error' : 'Please log in'});
    else
    {
        var con = mysql.createConnection(conInfo);
        con.connect(function(err)
        {
            if(err)
                writeResult(req, res, {'error' : err});
            else
            {
                con.query('SELECT * FROM SONG WHERE USER_ID = (?)', [req.session.user.result.id], function(err, result, fields)
                {
                    if(err)
                        writeResult(req, res, {'error' : err});
                    else
                        writeResult(req, res, {'result' : result});
                });
            }
        });
    }
}

function addSong(req, res)
{
    if(req.session.user == undefined)
        writeResult(req, res, {'error' : 'No one is logged in'});
    else if(req.query.song == undefined || req.query.song == "")
        writeResult(req, res, {'error' : 'Please enter a song name'});
    else
    {
        var con = mysql.createConnection(conInfo);
        con.connect(function(err)
        {
            if(err)
                writeResult(req, res, {'error' : err});
            else
            {
                con.query('INSERT INTO SONG (USER_ID, SONG_NAME) VALUES (?, ?)', [req.session.user.result.id, req.query.song], function(err, result, fields)
                {
                    if(err)
                        writeResult(req, res, {'error' : err});
                    else
                    {
                        con.query('SELECT * FROM SONG WHERE USER_ID = (?)', [req.session.user.result.id], function(err, result, fields)
                        {
                            if(err)
                                writeResult(req, res, {'error' : err});
                            else
                                writeResult(req, res, {'result' : result});
                        });
                    }
                });
            }
        });
    }
}

function removeSong(req, res)
{
    if(req.session.user == undefined)
        writeResult(req, res, {'error' : 'No one is logged in'});
    else if(req.query.song == undefined || req.query.song == "")
        writeResult(req, res, {'error' : 'Please enter a song name'});
    else
    {
        var con = mysql.createConnection(conInfo);
        con.connect(function(err)
        {
            if(err)
                writeResult(req, res, {'error' : err});
            else
            {
                con.query('DELETE FROM SONG WHERE USER_ID = (?) AND SONG_NAME  = (?)', [req.session.user.result.id, req.query.song],  function(err, result, fields)
                {
                    if(err)
                        writeResult(req, res, {'error' : err});
                    else
                    {
                        con.query('SELECT * FROM SONG WHERE USER_ID = (?)', [req.session.user.result.id], function(err, result, fields)
                        {
                            if(err)
                                writeResult(req, res, {'error' : err});
                            else
                                writeResult(req, res, {'result' : result});
                        });
                    }
                });
            }
        });
    }
}

function clearSongs(req, res)
{
    if(req.session.user == undefined)
        writeResult(req, res, {'error' : 'No one is logged in'});
    else
    {
        var con = mysql.createConnection(conInfo);
        con.connect(function(err)
        {
            if(err)
                writeResult(req, res, {'error' : err});
            else
            {
                con.query('DELETE FROM SONG WHERE USER_ID = (?)', [req.session.user.result.id], function (err, result, fields)
                {
                    if(err)
                        writeResult(req, res, {'error' : err});
                    else
                        listSongs(req, res);
                });
            }
        });
    }
}

function writeResult(req, res, obj)
{
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(obj));
    res.end('');
}

function validateEmail(email)
{
    if(email == undefined)
    {
        return false;
    }
    else
    {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}

function validatePassword(password)
{
    if(password == undefined)
    {
        return false;
    }
    else
    {
        var re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        return re.test(password);
    }
}