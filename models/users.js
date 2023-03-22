const mongoose = require('mongoose');
const { Schema, model } = mongoose

// Schema
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: { type: String, require: true },
    content: {
        type: String,
        required: true,
    },
    cover: {
        type: String,
        required: true,
    }
})

// Model
const UserModel = model('User', userSchema)

// Export model
module.exports = UserModel