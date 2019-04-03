// api.js

// BASE SETUP
// =============================================================================

// Constant
const DEFAULT_PORT = 8888;
const DEFAULT_HOST = "0.0.0.0";


// call the packages we need
var express    = require('express');        	// call express
var app        = express();                 	// define our app using express
var compression = require('compression')
var helmet = require('helmet')
var cors = require('cors')
var fs 		   = require('fs');

// Server host and port
var port = process.env.API_PORT || DEFAULT_PORT;    // set our port
var host = process.env.API_HOST || DEFAULT_HOST;    // set our host


// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.get('/', function(req, res) {
    res.json({ message: 'welcome!' });
});

router.get('/:contractName', function(req, res) {
	var truffleArtefact = JSON.parse(fs.readFileSync('/project/contracts/'+req.params.contractName+'.json', 'utf8'));
	var contractAddress = truffleArtefact.networks[Object.keys(truffleArtefact.networks)[0]].address;
    res.json({ "name": req.params.contractName, "address": contractAddress });
});

router.get('/:contractName/all', function(req, res) {
	var truffleArtefact = JSON.parse(fs.readFileSync('/project/contracts/'+req.params.contractName+'.json', 'utf8'));
    res.json(truffleArtefact);
});

router.get('/sidechain/:contractName', function(req, res) {
	var truffleArtefact = JSON.parse(fs.readFileSync('/project/contracts/sidechain/'+req.params.contractName+'.json', 'utf8'));
	var contractAddress = truffleArtefact.networks[Object.keys(truffleArtefact.networks)[0]].address;
    res.json({ "name": req.params.contractName, "address": contractAddress });
});

router.get('/sidechain/:contractName/all', function(req, res) {
	var truffleArtefact = JSON.parse(fs.readFileSync('/project/contracts/sidechain/'+req.params.contractName+'.json', 'utf8'));
    res.json(truffleArtefact);
});

//SETUP CORS
//=========================================================

app.use(helmet())
app.use(compression())
app.use(cors())

// REGISTER OUR ROUTES -------------------------------
app.use('/smartcontract', router);


// START THE SERVER
// =============================================================================
app.listen(port, host);
