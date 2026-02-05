import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ObjectId } from 'mongodb';
import { authenticateLogin } from './middleware/auth.js';

const client = new MongoClient(process.env.MONGO_URI);

const getNextSequence = async (name, db) => {
    const result = await db.collection("counters").findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );
    return result.seq;
};

export async function createUser(fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.USERS_COLLECTION);

        if (await collection.findOne({ email: fields.email })) {
            return [409, 'Already Exist'];
        }

        const id = await getNextSequence("users", db);

        const doc = {
            userId: id,
            name: fields.name,
            email: fields.email,
            password: fields.password,
            address: fields.address
        }

        await collection.insertOne(doc);
        return [201, 'Created'];
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function login(fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.USERS_COLLECTION);

        const doc = await collection.findOne({ email: fields.email });

        if (doc) {
            if (doc.password == fields.password) {

                const token = authenticateLogin(doc.userId, doc.name);
                return [200, token];
            }
            return [401, 'Unauthorized'];
        }
        return [404, 'Not Found'];
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function updateInfo(req, fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.USERS_COLLECTION);

        const doc = await collection.findOne({ userId: req.user.userId });

        if (doc) {
            await collection.updateOne(
                { userId: req.user.userId },
                { $set: { name: fields.name, password: fields.password, address: fields.address } }
            );

            return [204, 'Updated'];
        }
        return [400, 'Internal Server Error'];
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function searchGame(game) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.GAMES_COLLECTION)

        const games = await collection.find({
            name: { $regex: game, $options: "i" }
        }).toArray();

        return [200, games]
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function addGame(req, fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.GAMES_COLLECTION);

        const id = await getNextSequence("games", db);

        const doc = {
            id,
            ownerId: req.user.userId,
            name: fields.name,
            publisher: fields.publisher,
            yearPublished: fields.yearPublished,
            system: fields.system,
            condition: fields.condition,
            previousOwners: 0
        }

        await collection.insertOne(doc);
        return [201, 'Created'];
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function updateGameProperties(req, fields, gameId) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.GAMES_COLLECTION);

        const doc = await collection.findOne({ id: gameId })
        if (doc) {
            if (doc.ownerId === req.user.userId) {
                await collection.updateOne(
                    { id: gameId },
                    { $set: { 
                        name: fields.name ?? doc.name,
                        publisher: fields.publisher ?? doc.publisher,
                        yearPublished: fields.yearPublished ?? doc.yearPublished,
                        system: fields.system ?? doc.system,
                        condition: fields.condition ?? doc.condition
                    } }
                )
                return [202, 'Game Edited']
            }
            else {
                return [401, "Unauthorized"]
            }
        } else {
            return [404, 'Not Found']
        }
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function deleteGame(req, gameId) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.GAMES_COLLECTION);

        const doc = await collection.findOne({ id: gameId });
        if (doc) {
            if (doc.ownerId === req.user.userId) {
                await collection.deleteOne({ id: gameId });
                return [202, 'Deleted']
            }
        } else {
            return [404, 'Not Found'];
        }
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function viewOffers(req) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.OFFERS_COLLECTION);

        const docs = await collection.find({ receiver: req.user.userId }).toArray();

        console.log(docs)
        
        return [200, docs];
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function tradeOffer(req, fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.GAMES_COLLECTION);

        const offeredItem = await collection.findOne({ id: fields.offeredId });
        const desiredItem = await collection.findOne({ id: fields.desiredId });

        if ((offeredItem && offeredItem.ownerId === req.user.userId) && (desiredItem && desiredItem.ownerId !== req.user.userId)) {
            const offers = db.collection(process.env.OFFERS_COLLECTION);

            const tradeId = await getNextSequence("trades", db);

            const doc = {
                tradeId,
                sender: req.user.userId,
                offeredGameId: offeredItem.id,
                desiredGameId: desiredItem.id,
                receiver: desiredItem.ownerId
            }

            await offers.insertOne(doc);
            return [200, 'Offer Sent']
        }
        return [400, 'Offer Error']
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}

export async function acceptOffer(req, id) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const offersCollection = db.collection(process.env.OFFERS_COLLECTION);
        const gamesCollection = db.collection(process.env.GAMES_COLLECTION);

        const doc = await offersCollection.findOne({ tradeId: id });

        if (doc && doc.receiver === req.user.userId) {
            await gamesCollection.updateOne(
                { id: doc.offeredGameId },
                { $set: { ownerId: doc.receiver } }
            )

            await gamesCollection.updateOne(
                { id: doc.desiredGameId },
                { $set: { ownerId: doc.sender } }
            )

            return [200, 'Trade Complete'];
        }
        return [400, 'Trade Error']
    } catch (error) {
        console.error(error);
        return [500, error];
    } finally {
        await client.close();
    }
}