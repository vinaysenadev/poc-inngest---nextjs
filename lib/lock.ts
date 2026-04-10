import clientPromise from "./mongodb";

const DB_NAME = "inngest-orchestrator";
const COLLECTION_NAME = "locks";

interface JobLock {
  _id: string;
  locked: boolean;
  result?: any;
  updatedAt: Date;
}

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<JobLock>(COLLECTION_NAME);
}

export const checkAndLock = async (apiName: string): Promise<boolean> => {
  const collection = await getCollection();

  try {
    const result = await collection.findOneAndUpdate(
      { _id: apiName, locked: { $ne: true } },
      {
        $set: {
          locked: true,
          updatedAt: new Date(),
          result: {},
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    return !!result;
  } catch (error: any) {
    return false;
  }
};

export const saveJobResult = async (apiName: string, data: any) => {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: apiName },
    { $set: { result: data, updatedAt: new Date() } },
    { upsert: true }
  );
};

export const incrementJobCounter = async (
  apiName: string,
  field: string,
  amount: number = 1,
) => {
  const collection = await getCollection();
  const result = await collection.findOneAndUpdate(
    { _id: apiName },
    {
      $inc: { [`result.${field}`]: amount },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after", upsert: true },
  );
  return result;
};

export const getJobStatus = async (apiName: string) => {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: apiName });

  if (!doc) {
    return { status: "idle" };
  }

  if (doc.locked) {
    return { status: "running" };
  }

  if (doc.result) {
    return { status: "completed", data: doc.result };
  }

  return { status: "idle" };
};

export const getAllJobStatuses = async () => {
  const collection = await getCollection();
  const docs = await collection.find({}).toArray();

  const statusMap: Record<string, any> = {};
  docs.forEach((doc) => {
    let status = "idle";
    if (doc.locked) status = "running";
    else if (doc.result) status = "completed";

    statusMap[doc._id as string] = {
      status,
      data: doc.result,
    };
  });

  return statusMap;
};

export const unlock = async (apiName: string) => {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: apiName },
    { $set: { locked: false, updatedAt: new Date() } },
  );
};

export const resetAllLocks = async () => {
  const collection = await getCollection();
  await collection.deleteMany({});
};
