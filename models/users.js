const mongoose = require('mongoose');
const { Schema, model } = mongoose

// Schema
const userSchema = new Schema({
    username: {
        type: String,
        require: true,
        unique: true
    },
    password: { type: String, require: true }
})

// Model
const UserModel = model('User', userSchema)

// Export model
module.exports = UserModel