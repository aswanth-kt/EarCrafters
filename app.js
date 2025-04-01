const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv').config();
const session = require('express-session');
const passport = require("./config/passport");
const MongoStore = require("connect-mongo");

const db = require('./config/db');
db();

const userRouter = require('./routes/userRouter');
const adminRouter = require("./routes/adminRouter");



app.use(express.json());    //for convert form data
app.use(express.urlencoded({extended: true}));    //convert urls string

// Session setup
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    store: MongoStore.create({mongoUrl: process.env.MONGODB_URI}),
    cookie : {
        secure : false, //Remind change to true at production time
        httpOnly : true,
        maxAge : 72*60*60*1000
    },
}));


app.use(passport.initialize());
app.use(passport.session());


// // To prevent data store in browser cache
// app.use((req, res, next) => {
//     res.set('cache-control' , 'no-store')
//     next();
// });

app.use((req, res, next) => {
    res.header("Cache-Control", "no-cache,  no-store, must-revalidate");
    next();
});

app.set("view engine" , "ejs");     //set view engine

app.set("views" , [
    path.join(__dirname, "views/user"), 
    path.join(__dirname, "views/admin"),
]);      //set views path for user & admin

app.use(express.static(path.join(__dirname, "public")));     //mension static folder


// Routes
app.use("/", userRouter);
app.use("/admin", adminRouter);



const port = process.env.PORT || process.env.SECOND_PORT;
app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});



module.exports = app;