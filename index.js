const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config({ path: 'sample.env' })
const bodyParser = require('body-parser')
const mongooose = require('mongoose')
const { default: mongoose } = require('mongoose')

mongooose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(bodyParser.urlencoded({ extended: false }))

// init

const userSchema = new mongooose.Schema({
  username: { type: String, unique: true, required: true },
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercises' }],
})

let User = mongooose.model('User', userSchema)

const exercisesSchema = new mongooose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now }
});

let Exercises = mongoose.model('Exercises', exercisesSchema);

const createNewUser = async (username) => {
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    return savedUser;
  } catch (err) {
    console.error('Error creating user:', err);
    return null;
  }
};

app.post('/api/users', async function (req, res) {
  const { username } = req.body; // Destructure directly for clarity

  try {
    const newUser = await createNewUser(username);
    if (newUser) {
      res.json({ username: username, _id: newUser._id.toString() });
    } else {
      res.json({ message: 'Error creating user' });
    }
  } catch (err) {
    console.error('Error handling POST request:', err);
    res.json({ message: 'Error handling POST request' });
  }
});

const findAllUsers = async (username) => {
  try {
    const users = await User.find();
    return users;
  } catch (err) {
    console.error('Error finding users')
    return null
  }
}

app.get('/api/users', async function (req, res) {
  try {
    const users = await findAllUsers();
    if (users) {
      res.json(users);
    } else {
      res.json({ message: 'Error retrieving users' });
    }
  } catch (err) {
    console.error('Error handling GET /api/users request:', err);
    res.json({ message: 'Error handling GET /api/users request' });
  }
})

const findUser = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (err) {
    console.error('Error finding user')
    return null
  }
}

const createNewExercise = async (userId, description, duration, date) => {
  try {
    const newExercise = new Exercises({
      userId,
      description,
      duration,
      date,
    });
    const savedExercise = await newExercise.save();
    return savedExercise;
  } catch (err) {
    console.error('Error creating exercise:', err);
    return null;
  }
};


 
const findExercisesForUserId = async (userId, fromDate, toDate, limit) => {
    try {
        const query = { userId: new mongoose.Types.ObjectId(userId) };
        if (fromDate && toDate) {
            query.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        }
        const exercises = await Exercises.find(query)
            .sort({ date: 1 })
            .limit(limit || 100); // Limit results or default to 100
        return exercises || [];
    } catch (err) {
        console.error('Error finding exercises for user');
        return null;
    }
};

app.post('/api/users/:param/exercises', async (req, res) => {
  let { description, duration, date } = req.body;
  let linkUserId = req.params.param;

  try {
    const user = await findUser(linkUserId);

    if (!user) {  
      return res.json({ message: 'User not found' });
    }

    if (!date) {
      date = new Date().toDateString();
    } else {
      date = new Date(date).toDateString();
    }

    const newExercise = await createNewExercise(linkUserId, description, duration, date);
    if (newExercise) {
      user.exercises.push(newExercise);
      await user.save();
      res.json({
        
        username: user.username,
        description: description,
        duration: parseInt(duration),
        date: date,
        _id: user._id.toString(),
      });
    } else {
      res.json({ message: 'Error creating exercise' });
    }
  } catch (err) {
    console.error('Error handling POST request:', err);
    res.json({ message: 'Error handling POST request with exercise' });
  }
});



app.get('/api/users/:param/logs', async (req, res) => {
  let linkUserId = req.params.param;

  try {
    let user = await findUser(linkUserId);
    let exercisesList = await findExercisesForUserId(linkUserId, req.query.from, req.query.to, req.query.limit);
    const aggregatedData = {
      username: user.username,
      count: exercisesList.length,
      _id: user._id.toString(),
      log: exercisesList.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    };
    res.json(aggregatedData)

  } catch (err) {
    console.error('Error handling GET request:', err);
    res.json({ message: 'Error handling GET request with log exercises' });
  }

})

/* 
let createNewUser = (input) => {
  let newUser = new User({
    user: input
  })
  newUser.save()
  .then((data) => {return data})
  .catch((err => console.error(err))) 
    
    
  
}

app.post('/api/users', function (req, res) {
   
  console.log(createNewUser(req.body.username))
}) */

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
