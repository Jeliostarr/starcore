const express = require('express');
const app = express();
const __path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;

let server = require('./qr');
let code = require('./pair');

// Increase event listeners if needed
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware should be set up BEFORE routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static file serving (if you have CSS, JS, images)
app.use(express.static(__path));

// Routes
app.use('/qr', server);
app.use('/code', code);

app.use('/pair', (req, res) => {
    res.sendFile(__path + '/pair.html');
});

app.use('/', (req, res) => {
    res.sendFile(__path + '/main.html');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star
Server running on http://localhost:${PORT}`);
});

module.exports = app;
