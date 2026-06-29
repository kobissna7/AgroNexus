require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/v1/health', require('./routes/health'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/listings', require('./routes/listings'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/transport', require('./routes/transport'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/forecasts', require('./routes/forecasts'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`AgroNexus backend running on port ${PORT}`));
