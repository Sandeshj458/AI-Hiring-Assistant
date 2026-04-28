// REST API surface. Route handlers stay thin — controllers do the work.

const express = require('express');

const upload = require('../middleware/upload');
const resumeController = require('../controllers/resumeController');
const scoringController = require('../controllers/scoringController');
const shortlistController = require('../controllers/shortlistController');
const emailController = require('../controllers/emailController');

const router = express.Router();

// --- Resume ---
router.post('/upload-resume', upload.single('resume'), resumeController.upload);
router.post('/parse-resume', resumeController.parse);
router.post('/batch-process', upload.array('resumes', 25), resumeController.batchProcess);

// --- Scoring + shortlist ---
router.post('/score-candidate', scoringController.score);
router.get('/shortlisted', shortlistController.list);
router.get('/candidates', shortlistController.allRanked);
router.get('/export', shortlistController.exportCsv);

// --- Email ---
router.post('/generate-email', emailController.generate);
router.post('/send-email', emailController.send);

module.exports = router;
