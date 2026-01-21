import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI);

var uid;

export async function createUser(fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.USERS_COLLECTION);

        if (await collection.findOne({ email: fields.email })) {
            return [409, 'Already Exist'];
        }

        const doc = {
            name: fields.name,
            email: fields.email,
            password: fields.password,
            address: fields.address
        }

        const result = await collection.insertOne(doc);
        return [201, 'Created'];
    } catch (error) {
        console.error(error);
        return [400, error];
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
                uid = doc._id;
                return [200, 'Login Successful'];
            }
            return [401, 'Unauthorized'];
        }
        return [404, 'Not Found'];
    } catch (error) {
        console.error(error);
        return [400, error];
    } finally {
        await client.close();
    }
}

export async function updateInfo(fields) {
    try {
        await client.connect();

        const db = client.db(process.env.MONGO_DB);
        const collection = db.collection(process.env.USERS_COLLECTION);

        if (uid) {
            const doc = await collection.findOne({ _id: uid });
            
            if (doc) {
                doc.name = fields.name;
                doc.password = fields.password;
                doc.address = fields.address;

                await doc.save();

                return [204, 'Updated'];
            }
        }
        return [500, 'Internal Server Error'];
    } catch (error) {
        console.error(error);
        return [400, error];
    } finally {
        await client.close();
    }
}

export async function searchGame(game) {
    if (uid) {
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
            return [400, error];
        } finally {
            await client.close();
        }
    }
    return [401, 'Unauthorized'];
}

export async function addGame(fields) {
    if (uid) {
        try {
            await client.connect();

            const db = client.db(process.env.MONGO_DB);
            const collection = db.collection(process.env.GAMES_COLLECTION);

            const getNextSequence = async (name) => {
                const result = await db.collection("counters").findOneAndUpdate(
                    { _id: name },
                    { $inc: { seq: 1 } },
                    { returnDocument: "after", upsert: true }
                );
                return result.seq;
            };

            const id = await getNextSequence("games");

            const doc = {
                id,
                owner: uid,
                name: fields.name,
                publisher: fields.publisher,
                yearPublished: fields.yearPublished,
                system: fields.system,
                condition: fields.condition,
                previousOwners: 0
            }

            const result = await collection.insertOne(doc);
            return [201, 'Created'];
        } catch (error) {
            console.error(error);
            return [400, error];
        } finally {
            await client.close();
        }
    }

    return [401, 'Unauthorized'];
}

export async function deleteGame(gameId) {
    if (uid) {
        try {
            await client.connect();

            const db = client.db(process.env.MONGO_DB);
            const collection = db.collection(process.env.GAMES_COLLECTION);

            const doc = await collection.findOne({ id: gameId });
            if (doc) {
                console.log(uid)
                if (doc.owner.equals(new ObjectId(uid))) {
                    await collection.deleteOne({ _id: doc._id });
                    return [202, 'Deleted']
                }
            } else {
                return [404, 'Not Found'];
            }
        } catch (error) {
            console.error(error);
            return [400, error];
        } finally {
            await client.close();
        }
    }
    return [401, 'Unauthorized'];
}