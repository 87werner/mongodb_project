const mongoose = require("mongoose");
const { stringify } = require("querystring");

const user = new mongoose.Schema({
    name: {
        type: String,
        reguired: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean,
        default: false
    },

});

module.exports = mongoose.model('user', user) 