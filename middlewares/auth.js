const { promisify } = require("util");
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');



exports.isLoggedIn = async (req, res, next) => {
    console.log("Checking if user is logged in ");

    if(req.cookies.jwt){
        // console.log("The cookie JWT exists")// cookie exists next need to decode the cookie

        const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
        console.log(decoded)// == we have aceess to the id of the user in the object { id: '5ff5963f49f46d542b2bc7bd', iat: 1609950748, exp: 1617726748 }

        req.userFound = await User.findById(decoded.id)
    }
    
    next()
}

// pass this to routes using auth.isLoggedin (why auth? imported in server.js const auth = require('./middlewares/auth'))