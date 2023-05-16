const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config()
const cors = require('cors');

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.4plofch.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

 const verifyJWT = (req, res, next) => {
      const authorization = req.headers.authorization;
      if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'})
      }
      const token = authorization.split(' ')[1]
      jwt.verify(token, process.env.CAR_WEB_SECRET_TOKEN , (error, decoded) => {
        if(error){
          return res.status(403).send({error: true, message: 'unauthorized access'})
        }
        req.decoded = decoded
        next()
      } );
 }

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceDatabase = client.db('carDoctor').collection('service')
    const orderDatabase = client.db('carDoctor').collection('orders')


    // JWT
    app.post('/tokens', (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.CAR_WEB_SECRET_TOKEN, { expiresIn: '100h' } );
      res.send({token})
    })


    // SERVICES ROUTES
    app.get('/services', async(req, res) => {
      const cursor = serviceDatabase.find()
      const result = await cursor.toArray()
       res.send(result)
    })

    app.get('/services/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await serviceDatabase.findOne(query)
      res.send(result)
    })


    // BOOKINGS ROUTES
    app.get('/bookings', verifyJWT, async(req, res) => {
      console.log('welcome to comeback')
      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: 'forbidden access'})
      }
      let query = []
      if(req.query?.email){
          query = {email: req.query.email}
      }
      const result = await orderDatabase.find(query).toArray();
      res.send(result)
    })

    // Checkout form teke data ante
    app.post('/bookings', async (req, res) => {
      const service = req.body;
      console.log('new user', service);
      const result = await orderDatabase.insertOne(service)
      res.send(result)
    })

    app.patch('/bookings/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const updatedBooking = req.body;
      console.log(updatedBooking)
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await orderDatabase.updateOne(query, updateDoc)
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      // console.log('delete', id)
      const query = { _id: new ObjectId(id) };
      const result = await orderDatabase.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Car doctor server is running')
})

app.listen(port, () => {
    console.log(`Car doctor server is running on port : ${port}`)
})