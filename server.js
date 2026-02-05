import express from 'express'
import * as mongodb from './Mongo.js';
import { authenticateToken } from './middleware/auth.js';

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

const swaggerDocument = YAML.load("./API_Documentation.yaml");

const app = express();
const port = 3000;
const router = express.Router();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

function checkMissing(requiredFields, body) {
    return requiredFields.filter(field => !body[field]);
}

router.use((req, res, next) => {
    console.log('Users Router Time: ', Date.now());
    next();
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

    const [status, token] = await mongodb.login(fields);
    return res.status(status).json({ Bearer: token });
});

router.patch('/update', authenticateToken, async (req, res) => {
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

    const [status, message] = await mongodb.updateInfo(req, fields)
    return res.status(status).json(message);
})

router.get('/games', authenticateToken, async (req, res) => {
    const name = req.body?.name?.trim?.() || "";
    const [status, message] = await mongodb.searchGame(name);
    return res.status(status).json(message);
})

router.post('/games', authenticateToken, async (req, res) => {
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

    const [status, message] = await mongodb.addGame(req, fields);
    return res.status(status).json(message);
});

router.put('/games/:id', authenticateToken, async (req, res) => {
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

    const [status, message] = await mongodb.updateGameProperties(req, fields, Number(req.params.id));
    return res.status(status).json(message);
})

router.patch('/games/:id', authenticateToken, async (req, res) => {
    const fields = {
        name: req.body.name ?? null,
        publisher: req.body.publisher ?? null,
        yearPublished: req.body.yearPublished ?? null,
        system: req.body.system ?? null,
        condition: req.body.condition ?? null
    };

    const [status, message] = await mongodb.updateGameProperties(req, fields, Number(req.params.id));
    return res.status(status).json(message);
})

router.delete('/games/:id', authenticateToken, async (req, res) => {
    const [status, message] = await mongodb.deleteGame(req, Number(req.params.id));
    return res.status(status).json(message);
});

router.get('/games/offer', authenticateToken, async (req, res) => {
    const [status, message] = await mongodb.viewOffers(req);
    return res.status(status).json(message);
})

router.post('/games/offer', authenticateToken, async (req, res) => {
    const requiredFields = ['offeredId', 'desiredId'];

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

    const [status, message] = await mongodb.tradeOffer(req, fields);
    return res.status(status).json(message);
})

router.post('/games/offer/:id', authenticateToken, async (req, res) => {
    const [status, message] = await mongodb.acceptOffer(req, Number(req.params.id));
    return res.status(status).json(message);
})

app.listen(port, () => {
    console.log(`Server running on http://localhost/${port}`);
});

app.get("/health", (req, res) => {
    console.log(`Handled by container: ${process.env.HOSTNAME}`);
    res.json({ container: process.env.HOSTNAME });
});

app.use(router);