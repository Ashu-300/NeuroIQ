const express = require('express');
const router = express.Router();
const { getProctoringReport } = require('../controllers/proctoringController');

router.get("/report" , getProctoringReport) ;

module.exports = router;
