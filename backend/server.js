const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const callOpenAi = require('./callOpenAi');

const app = express();
const port = process.env.PORT || 3005;

app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
    );
    if (req.method === "OPTIONS") {
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        );
    }
    next();
});
app.use(bodyParser.json());

app.post('/execute-command', async (req, res) => {
    const command = req.body.command;

    try {
        const result = await callOpenAi(command);
        res.send(result);
    }

    catch (error) {
        res.status(500).send(error.message);
    }
    
});

app.get("/heavyData", (req, res) => {
    const payload = "this is a heavy data";
    res.json({ data: payload.repeat(100000) });
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

module.exports = app;