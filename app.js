const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const port = process.env.PORT;
const db = require('./config/db');
const userRouter = require('./routes/userRouter');
// const router = require('./routes/userRouter');
db()




app.use(express.json());    //for convert form data
app.use(express.urlencoded({extended: true}));    //convert urls string


app.set("view engine" , "ejs");     //set view engine

app.set("views" , [path.join(__dirname, "views/user"), 
    path.join(__dirname, "views/admin")]);      //set views path for user & admin

app.use(express.static(path.join(__dirname, "public")));     //mension static folder




app.use("/", userRouter);




app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});



module.exports = app;