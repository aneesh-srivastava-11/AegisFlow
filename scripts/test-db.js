import { MongoClient } from 'mongodb';

async function test() {
  const uri = "mongodb+srv://aneeshsrivastava11jul2005_db_user:wbS88a36dUh9IcTn@cluster0db.kx4awbq.mongodb.net/?appName=Cluster0DB";
  console.log("Connecting...");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    console.log("Connected successfully!");
    await client.close();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

test();
