const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv').config();
const session = require('express-session');

const db = require('./config/db');
const userRouter = require('./routes/userRouter');
db()


app.use(express.json());    //for convert form data
app.use(express.urlencoded({extended: true}));    //convert urls string

// Session setup
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        secure : false, //Remind change to true at production time
        httpOnly : true,
        maxAge : 72*60*60*1000
    }
}));

// To prevent data store to browser
app.use((req, res, next) => {
    res.set('cache-control' , 'no-store')
    next();
});

app.set("view engine" , "ejs");     //set view engine

app.set("views" , [path.join(__dirname, "views/user"), 
    path.join(__dirname, "views/admin")]);      //set views path for user & admin

app.use(express.static(path.join(__dirname, "public")));     //mension static folder




app.use("/", userRouter);



const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});



module.exports = app;