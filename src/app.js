import express, { json } from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import chalk from "chalk";
import joi from "joi";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";
import nodemon from "nodemon";

// --------- APP CONFIG ---------
const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

// --------- TIMESTAMPS ---------
const getCurrentTimestamp = () => dayjs().unix();
const getCurrentTimestampFormatted = () => dayjs().format("HH:mm:ss");

// --------- MONGO INIT ---------
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    await mongoClient.connect();
    console.log(chalk.bold.green('MongoDB OK'));
} catch (err) {
    console.log(chalk.bold.red(err.message));
}

const db = mongoClient.db();

// --------- JOI SCHEMAS ---------
const schema_user = joi.object({
    name: joi.string().min(1).required(),
  });
  
  const schema_message = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.any().valid('message', 'private_message').required(),
  });

// --------- PARTICIPANTS POST/GET ---------
app.post('/participants', async (req, res) => {
    const { name } = req.body;

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
            await db.collection('participants').insertOne({
                name: stripHtml(name.toString()).result.trim(),
                lastStatus: getCurrentTimestamp()
            });

            await db.collection('messages').insertOne({
                from: name,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: getCurrentTimestampFormatted()
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

// --------- MESSAGES POST/GET/PUT/DELETE ---------
app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;

    const validation = schema_message.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const validationErrors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(validationErrors);
    }

    if (!from) {
        return res.status(422).send('"From/User" field is required');
    }

    const participant = await db.collection('participants').findOne({ name: from });
    if (!participant) {
        return res.status(422).send('User not found');
    }

    try {
        await db.collection('messages').insertOne({
            from: stripHtml(from.toString()).result.trim(),
            to: stripHtml(to.toString()).result.trim(),
            text: stripHtml(text.toString()).result.trim(),
            type: stripHtml(type.toString()).result.trim(),
            time: getCurrentTimestampFormatted()
        });

        return res.sendStatus(201);
    } catch (err) {
        console.log(chalk.bold.red(err.message));
        return res.status(500).send('Internal Server Error');
    }
});


app.get('/messages', async (req, res) => {
    const user = req.headers.user;
    const { limit } = req.query;

    if (limit) {
        const validation = schemaLimit.validate(limit);
        if (validation.error) {
            const errors = validation.error.details.map((detail) => detail.message);
            return res.status(422).send(errors);
        }
    }

    if (user === "admin") {
        try {
            if (limit !== undefined) {
                const messages = await db
                    .collection("messages")
                    .find()
                    .sort({ $natural: -1 })
                    .limit(Number(limit))
                    .toArray();
                return res.status(200).send(messages);
            }

            const messages = await db.collection("messages").find().toArray();
            return res.status(200).send(messages);
        } catch (err) {
            return res.status(500).send(err.message);
        }
    }

    try {
        if (limit !== undefined) {
            const messages = await db
                .collection("messages")
                .find({ $or: [{ to: user }, { to: 'Todos' }, { from: user }] })
                .sort({ $natural: -1 })
                .limit(Number(limit))
                .toArray();
            return res.status(200).send(messages);
        }

        const messages = await db
            .collection("messages")
            .find({ $or: [{ to: user }, { to: 'Todos' }, { from: user }] })
            .toArray();
        res.status(200).send(messages);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// app.put('/messages:id', async (req, res) => {
    
// });

// app.delete('/messages:id', async (req, res) => {
    
// });u

// --------- STATUS POST ---------
app.post("/status", async (req, res) => {
    const user = req.headers.user;
    if (!user) return res.status(404).send("User header field required");
  
    const existingUser = await db.collection("participants").findOne({ name: stripHtml(user).result.trim() });
    if (!existingUser) return res.status(404).send("User not registered");
  
    try {
      await db
        .collection("participants")
        .updateOne(existingUser, { $set: { lastStatus: Date.now() } });
      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

// --------- REMOVE INACTIVE USERS ---------
setInterval(async () => {
    try {
      const currentTimestamp = getCurrentTimestamp(); 
      const inactiveUserList = await db
        .collection("participants")
        .find({ lastStatus: { $lt: currentTimestamp - 10000 } })
        .toArray();
  
        inactiveUserList.forEach(async (inactiveUser) => {
        db.collection("messages").insertOne({
          from: inactiveUser.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: getCurrentTimestampFormatted(),
        });
        db.collection("participants").deleteOne({ _id: participant._id });
      });
    } catch (err) {
      console.log(err.message);
    }
  }, 15000);

const PORT = 5000;
app.listen(PORT, () => console.log(chalk.bold.green(`Server running on ${PORT}`)));