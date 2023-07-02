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

// const db = mongoClient.db('batepapouol');
const db = mongoClient.db();

app.get("/", (req, res) => {
    res.send("Bate-papo UOL");
  });

// --------- JOI SCHEMAS ---------
const schema_user = joi.object({
    name: joi.string().min(1).required(),
  });
  
  const schema_message = joi.object({
    // from: joi.string().required(),
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.any().valid('message', 'private_message').required(),
  });

// --------- PARTICIPANTS ---------
app.post('/participants', async (req, res) => {
    let { name } = req.body;

    const validation = schema_user.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const validationErrors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(validationErrors);
    }

    if (!name) {
        return res.status(422).send('Username is required');
    }

    try {
        const existingParticipant = await db.collection('participants').findOne({ name });
        if (existingParticipant) {
            console.log(chalk.bgMagentaBright('Username taken'));
            return res.status(409).send('Username taken');
        } else {
            name = stripHtml(name.toString()).result.trim();
            await db.collection('participants').insertOne({
                name,
                lastStatus: Date.now()
            });

            // console.log('Inserted user:', {
            //     name: stripHtml(name.toString()).result.trim(),
            //     lastStatus: Date.now()
            // });

            await db.collection('messages').insertOne({
                from: name,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs().format('HH:mm:ss')
            });
            
            return res.sendStatus(201);
        }
    } catch (err) {
        console.log(chalk.bold.red(err.message));
        return res.status(500).send('Internal Server Error');
    }
});

app.get('/participants', async (req, res) => {
    try{
        const participants = await db.collection('participants').find().toArray();
        return res.status(200).send(participants);
    }catch{
        return res.status(500).send(err.message);
    }
});

// --------- MESSAGES ---------
app.post('/messages', async (req, res) => {
    let { to, text, type } = req.body;
    let from = req.headers.user;

    const validation = schema_message.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const validationErrors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(validationErrors);
    }

    try{
        await db.collection('messages').insertOne({
            from,
            to,
            text,
            type,
            time: dayjs().format('HH:mm:ss')
        })

        return res.sendStatus(201);

    }catch(err) {
        console.log(chalk.bold.red(err.message));
        return res.status(500).send('Internal Server Error');
    }


});

app.get('/messages', async (req, res) => {
    let user = req.headers.user;

    if(user === "admin") {
        try{
            const messages = await db.collection('messages').find().toArray();
            return res.status(200).send(messages);
        }catch{
            return res.status(500).send(err.message);
        }
    }
    
    try{
        const messages = await db.collection('messages').find({ $or: [{ to: user }, { to: 'Todos' }, { from: user }] }).toArray();
        res.status(200).send(messages);
    }catch{
        res.status(500).send(err.message);
    }
});

app.put('/messages:id', async (req, res) => {
    
});

app.delete('/messages:id', async (req, res) => {
    
});

// --------- STATUS ---------
app.post('/status', async (req, res) => {

});

const PORT = 5000;
app.listen(PORT, () => console.log(chalk.bold.green(`Server running on ${PORT}`)));