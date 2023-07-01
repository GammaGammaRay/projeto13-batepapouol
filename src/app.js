import express from "express";
import joi from "joi"
import cors from "cors"
import nodemon from "nodemon";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors);

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db();

