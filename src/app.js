import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import chalk from "chalk";
import joi from "joi";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";
import nodemon from "nodemon";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();


// --------- MONGO INIT ---------
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    await mongoClient.connect();
    console.log(chalk.bold.green('MongoDB OK'));
} catch (err) {
    console.log(chalk.bold.red(err.message));
}

const db = mongoClient.db();

app.get("/", (req, res) => {
    res.send("Bate-papo UOL");
  });

// --------- JOI SCHEMAS ---------
const schema_user = joi.object({
    name: joi.string().min(1).required(),
  });
  
  const schema_message = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.any().valid('message', 'private_message').required(),
  });

// --------- PARTICIPANTS ---------
app.post('/participants', async (req, res) => {
    let { username } = req.body;

    const validation = schema_user.validate(req.body, { abortEarly: false });

    if(validation.error) {
        return res.status(422).send(validation.error);
    }
    

})

app.get('/participants', async (req, res) => {
    try{
        const participants = await db.collection('participants').find().toArray();
        res.status(200).send(participants);
    }catch{
        res.status(500).send(err.message);
    }
})

// --------- MESSAGES ---------
app.post('/messages', async (req, res) => {
    
})

app.get('/messages', async (req, res) => {
    
})

app.put('/messages:id', async (req, res) => {
    
})

app.delete('/messages:id', async (req, res) => {
    
})

// --------- STATUS ---------
app.post('/status', async (req, res) => {

})

const PORT = 5000;
app.listen(PORT, () => console.log(chalk.bold.green(`Server running on ${PORT}`)));