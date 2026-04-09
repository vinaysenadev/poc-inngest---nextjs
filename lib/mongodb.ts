import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    console.log("[DB] Initializing new MongoClient in development...");
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch(err => {
      console.error("[DB] Failed to connect in development:", err);
      throw err;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  console.log("[DB] Initializing new MongoClient in production...");
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch(err => {
    console.error("[DB] Failed to connect in production:", err);
    console.error("[DB] Check if Vercel IP is whitelisted (0.0.0.0/0) in Atlas.");
    throw err;
  });
}

export default clientPromise;
