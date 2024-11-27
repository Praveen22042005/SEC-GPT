const express = require('express');
const router = express.Router();
const { getResponse } = require('../controllers/aiController');

router.post('/ask', getResponse);

module.exports = router;