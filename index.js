require('dotenv').config()
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose')
const User = require('./models/users')
const Post = require('./models/newPost')
const fs = require('fs')
const lib = require(__dirname + '/scripts/splitLastOccurrence.js')

const jwt = require('jsonwebtoken');
const privateKey = process.env.JSON_WEB_TOKEN_SECRET_KEY

const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);

const cookieParser = require('cookie-parser') // Parse Cookie header and populate req.cookies

const multer = require('multer') //middleware for multipart form data
const uploadMiddleware = multer({ dest: 'uploads/' })

// Express declaration
const app = express();

// Port
const port = 4000;

// Mongoose stuff
const db_url = process.env.MONGO_DB_URL
// mongoose.connect(db_url, { useNewUrlParser: true }) // modifying this to make it work on cycle
const connectDB = async () => {
    try {
      const conn = await mongoose.connect(db_url);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  }

// middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))

app.post('/register', uploadMiddleware.single('file'), async (req, res) => {
    try {
        const { username, password, content } = req.body

        if (password.length < 5) {
            throw new Error('Password must be atleast 6 characters')
        }

        const hash = bcrypt.hashSync(password, salt);

        let newPath = "/uploads/profile-pic-dummy.png"
        if (req.file) {
            const { path, originalname } = req.file
            newPath = lib.newPath(path, originalname)
            fs.renameSync(path, newPath)
        }
        const user = new User({ username, password: hash, content, cover: newPath })
        const userDoc = await user.save()

        res.status(200).json("ok")

    } catch (error) {
        res.status(400).json(error.message)
        console.log(error.message)
    }
})

app.post('/login', async (req, res) => {

    try {
        const { username, password } = req.body
        const userDoc = await User.findOne({ username })

        if (userDoc === null) {
            throw new Error('Cant find user in db')
        }

        const hash = userDoc.password
        const validateUserPassword = bcrypt.compareSync(password, hash)

        if (validateUserPassword) {
            const token = jwt.sign({ username, id: userDoc._id, iat: Math.floor(Date.now() / 1000) - 30 }, privateKey);
            res.cookie('token', token).status(200).json({ username, id: userDoc._id, cover: userDoc.cover, content: userDoc.content }); //cookie has to come first like so

        } else {
            throw new Error("Uesrname password don't match")
        }

    } catch (error) {
        res.status(400).json(error.message)
        console.log(error.message)
    }
})

app.get('/profile', (req, res) => {
    const { token } = req.cookies
    if (token === "") {
        res.status(200).json(null)

    } else {
        const cookieValidation = jwt.verify(token, privateKey)
        res.status(200).json(cookieValidation)
    }
})

app.post('/logout', (req, res) => {
    res.cookie('token', '').status(200).json('ok')
})

app.post('/newpost', uploadMiddleware.single('file'), async (req, res) => {
    try {
        const { token } = req.cookies
        if (token === "") {
            throw new Error("user must be logged in to create post")
        }
        const cookieValidation = jwt.verify(token, privateKey)

        const { path, originalname } = req.file
        const newPath = lib.newPath(path, originalname)
        fs.renameSync(path, newPath)

        const { title, content, summary } = req.body
        const postDoc = await Post.create({
            summary, content, title, cover: newPath, author: cookieValidation.id
        })

        res.status(200).json('ok')
    } catch (error) {
        res.status(400).json(error.message)
        console.log(error.message)
    }
})

app.get('/post', async (req, res) => {
    try {
        const posts = await Post.find({})
            .populate('author', { 'username': 1 })
            .sort({ 'createdAt': -1 })
            .limit(20)
        res.status(200).json(posts)

    } catch (error) {
        console.log(error.message)
        res.status(400).json('something bad happened')
    }
})

app.get('/post/:id', async (req, res) => {
    try {
        const { id } = req.params
        const post = await Post.findOne({ _id: id })
            .populate('author', { 'username': 1 })
        res.status(200).json(post)

    } catch (error) {
        console.log(error.message)
        res.status(400).json('something bad happened')
    }
})

app.get('/author/:id', async (req, res) => {
    try {
        const { id } = req.params
        const posts = await User.findOne({ _id: id }, { password: 0 })
        res.status(200).json(posts)

    } catch (error) {
        console.log(error.message)
        res.status(400).json('something bad happened')
    }
})

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
    try {
        const { id } = req.params
        const { token } = req.cookies
        if (token === "") {
            throw new Error("user must be logged in to create post")
        }
        const cookieValidation = jwt.verify(token, privateKey)

        const findPost = await Post.findById(id)

        const validateAuthor = JSON.stringify(findPost.author) === JSON.stringify(cookieValidation.id)
        if (!validateAuthor) {
            throw new Error('Author and editor are different')
        }

        const { title, content, summary } = req.body

        if (req.file) {
            const { path, originalname } = req.file
            const newPath = lib.newPath(path, originalname)
            fs.renameSync(path, newPath)

            const postDoc = await Post.findByIdAndUpdate(id, {
                summary, content, title, cover: newPath
            })
        } else {
            const postDoc = await Post.findByIdAndUpdate(id, {
                summary, content, title
            })
        }
        res.status(200).json('ok')
    } catch (error) {
        console.log(error.message)
    }
})

// app.listen(port, () => { console.log('App running on port ' + port) })
//Connect to the database before listening as per cycle
connectDB().then(() => {
    app.listen(port, () => {
        console.log("listening for requests");
    })
})



