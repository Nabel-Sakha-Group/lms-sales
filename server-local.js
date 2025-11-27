// server-local.js
// Simple local Express server to run the serverless function during development
// Run: node server-local.js
// Then set CREATE_USER_URL=http://localhost:3001/api/create-user in your app

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config(); // load .env file

const createUserHandler = require('./api/create-user');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Mount the serverless function
app.all('/api/create-user', (req, res) => {
  createUserHandler(req, res);
});

app.listen(PORT, () => {
  console.log(`Local serverless running at http://localhost:${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/create-user`);
  console.log('Set CREATE_USER_URL in your app to this endpoint for testing.');
});
