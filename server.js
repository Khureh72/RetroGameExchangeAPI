import express from 'express'
import * as mongodb from './Mongo.js';

const app = express();
const port = 3000;
const router = express.Router();

app.use(express.json());

function checkMissing(requiredFields, body) {
    return requiredFields.filter(field => !body[field]);
}

router.use((req, res, next) => {
    console.log('Users Router Time: ', Date.now());
    next();
});

router.get('/test', (req, res) => {
    res.send('Test');
});

router.post('/register', async (req, res) => {
    const requiredFields = ['name', 'email', 'password', 'address'];
    const missing = checkMissing(requiredFields, req.body);

    if (missing.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missing
        });
    }

    const fields = Object.fromEntries(
        requiredFields.map(field => [field, req.body[field]])
    );

    const [status, message] = await mongodb.createUser(fields);
    return res.status(status).send(message);
});

router.post('/login', async (req, res) => {
    const requiredFields = ['email', 'password'];
    const missing = checkMissing(requiredFields, req.body);

    if (missing.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missing
        });
    }

    const fields = Object.fromEntries(
        requiredFields.map(field => [field, req.body[field]])
    );

    const [status, message] = await mongodb.login(fields);
    return res.status(status).json(message);
});

router.patch('/update', async (req, res) => {
    const requiredFields = ['name', 'password', 'address'];
    const missing = checkMissing(requiredFields, req.body);

    if (missing.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missing
        });
    }

    const fields = Object.fromEntries(
        requiredFields.map(field => [field, req.body[field]])
    );

    const [status, message] = await mongodb.updateInfo(fields)
    return res.status(status).json(message);
})

router.get('/games', async (req, res) => {
    const name = req.body?.name?.trim?.() || "";
    console.log(name);
    const [status, message] = await mongodb.searchGame(name);
    return res.status(status).json(message);
})

router.post('/games', async (req, res) => {
    console.log('Post /games endpoint hit');
    const requiredFields = ['name', 'publisher', 'yearPublished', 'system', 'condition'];

    const missing = checkMissing(requiredFields, req.body);

    if (missing.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missing
        });
    }

    const fields = Object.fromEntries(
        requiredFields.map(field => [field, req.body[field]])
    );

    const [status, message] = await mongodb.addGame(fields);
    return res.status(status).json(message);
});

router.delete('/games/:id', async (req, res) => {
    const [status, message] = await mongodb.deleteGame(Number(req.params.id));
    return res.status(status).json(message);
});

app.listen(port, () => {
    console.log(`Server running on http://localhost/${port}`);
});

app.use('/api', router);