const express = require('express')
const mongoose = require('mongoose');
const User = require('./models/user');
const http = require('http')
const app = express()
const server = http.Server(app)
const { Server } = require('socket.io')
const io= new Server(server)
const jwt = require('jsonwebtoken');
const { disconnect } = require('process');
const JWT_SECRET = 'wenwajfkwiblebakjubwdfbwaugbuwb'

var names = [] 

//connecting to mongoose database
mongoose.connect('mongodb+srv://node-rest:node-rest@node-rest-shop.nxem7.mongodb.net/authapp?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})

app.use(express.json());
app.use(express.urlencoded({extended: false}))

//setting view-engine to ejs
app.set('view engine', 'ejs');

// API for registration
app.post('/api/register',(req,res)=>{
    console.log(req.body)
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    user.save()
    .then(result=>{
        //returning staus "ok" on successful registration
        console.log("user created");
            res.json({
            status: 'ok'
        })
    })
    .catch(err=>{
        //returning error in case of unsuccessful registration
        console.log("error");
        res.status(500).json({
            error: "Registration failed. Try a different username."
        })
    })
})

// API for login
app.post('/api/login',(req,res)=>{
    console.log(req.body)
    User.find({username: req.body.username})
    .select('username password')
    .exec()
    .then(docs =>{
        if(docs.length==0)
        {
            //returning error in case of invalid username
            console.log("invalid username")
            return res.json({
                status: "error",
                error: "invalid username"
            })
        }
        else if(docs[0].password === req.body.password)
        {
            //returning jwt token in case of successful login
            console.log("authenticated") 
            const token = jwt.sign({ id: docs[0]._id, username: docs[0].username },JWT_SECRET)
            return res.json({
                status: 'ok',
                data: token,
                username: docs[0].username
            })
        }
        else
        {
            //returning error in case of incorrect password
            console.log("incorrect password")
            return res.json({
                status: "error",
                error: "incorrect password"
            })
        }
    })
    .catch(err => {
        console.log("error");
    })
})


// Rendering home page
app.get('/home',(req,res)=>{
    res.render('home.ejs')
})

// Renddering chat room
app.get('/room/:roomid',(req,res)=>{
    res.render('room',{ id: req.params.roomid })
})

// setting 'public' folder as static
app.use(express.static('public'))

io.on('connection', (socket) => {

    //sending list of online users to all clients on joining of new client
    socket.on('name',(name)=>{
        names.push(name)
        io.emit('onlineusers',names)
    })

    
    socket.on('call',(msg)=>{
        io.emit('called',msg)
    })

    socket.on('disconnect',()=>{
        names=[]
        io.emit('refresh-names')
        
    })
    
    socket.on('new-participant',(msg)=>{
        console.log(msg)
        socket.join(msg.roomId)
        socket.broadcast.to(msg.roomId).emit('new-peer', msg.peerId)
        socket.on('disconnect',()=>{
            console.log(msg.peerId+" disconnected")
            socket.broadcast.to(msg.roomId).emit('user-hangedup', msg.peerId);
        })
    })

    socket.on('send message',(msg)=>{
        console.log(msg)
        // socket.join(msg.roomId)
        io.to(msg.roomId).emit('new-message', msg.message)
    })
})

// setting PORT to the port offered by the hosting service
const PORT = process.env.PORT || 5000


server.listen(PORT,()=>{
    console.log(`listening to ${PORT}`)
})