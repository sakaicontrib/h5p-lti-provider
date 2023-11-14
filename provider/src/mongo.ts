import type { Db } from 'mongodb';
import { initMongo } from '@lumieducation/h5p-mongos3';

var mongoDb: Db;
export default async function getMongoDb(): Promise<Db> {
    if (!mongoDb) {
      mongoDb = await initMongo();
    }
    return mongoDb;
}