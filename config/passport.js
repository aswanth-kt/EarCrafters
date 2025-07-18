const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const dotenv = require('dotenv').config();



passport.use(new GoogleStrategy(
    {
        clientID : process.env.GOOGLE_CLIENT_ID,
        clientSecret : process.env.gOOGLE_CLIENT_SECRET,
        callbackURL : "https://earcrafters.shop/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log("Google Profile:", profile);

            let user = await User.findOne({googleId : profile.id});
            if (user) {
                return done(null, user);
            } else {
                user = new User({
                    name : profile.displayName,
                    email : profile.emails[0].value,
                    googleId : profile.id
                });
                await user.save();
                return done(null, user);
            }
            
        } catch (error) {
            
            return done(error, null);
        }
    }

));



// User details store to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});


// Fetch user data from session
passport.deserializeUser((id, done) => {
    User.findById(id)
    .then(user => {
        done(null, user);
    })
    .catch(error => {
        done(error, null);
    });
});






module.exports = passport;
