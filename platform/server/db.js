import { MongoClient } from 'mongodb';

const memory = {
  users: [],
  history: [],
  pdfs: [],
};

let client;
let db;

export const connectDb = async (mongoUrl) => {
  if (!mongoUrl) {
    return null;
  }
  client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db();
  return db;
};

const getCollection = (name) => {
  if (!db) return null;
  return db.collection(name);
};

export const dbStore = {
  async upsertUser(user) {
    const collection = getCollection('users');
    if (!collection) {
      const existing = memory.users.find((u) => u.uid === user.uid);
      if (existing) Object.assign(existing, user);
      else memory.users.push(user);
      return user;
    }
    await collection.updateOne({ uid: user.uid }, { $set: user }, { upsert: true });
    return user;
  },
  async addHistory(entry) {
    const collection = getCollection('history');
    if (!collection) {
      memory.history.push(entry);
      return entry;
    }
    await collection.insertOne(entry);
    return entry;
  },
  async listHistory(uid) {
    const collection = getCollection('history');
    if (!collection) {
      return memory.history.filter((item) => item.uid === uid);
    }
    return collection.find({ uid }).sort({ createdAt: -1 }).toArray();
  },
  async addPdf(meta) {
    const collection = getCollection('pdfs');
    if (!collection) {
      memory.pdfs.push(meta);
      return meta;
    }
    await collection.insertOne(meta);
    return meta;
  },
};
