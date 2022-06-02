import express from 'express';
import helmet from 'helmet';
import rateLimiter from 'express-rate-limit';
import uuid from 'uuid/v4.js';
import expressWinston from 'express-winston';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { initialize } from 'express-openapi';
import swaggerUI from 'swagger-ui-express';
import config from './config/config.js';

import errorHandler from './indexcards/helpers/error.js';

import apiDoc from './indexcards/routes/api-doc.js';

import userPaths from './indexcards/routes/paths/user/index.js';
import tournPaths from './indexcards/routes/paths/tourn/index.js';
import invitePaths from './indexcards/routes/paths/invite/index.js';
import caselistPaths from './indexcards/routes/paths/caselist/index.js';

import auth from './indexcards/helpers/auth.js';
import tournAuth from './indexcards/helpers/tourn-auth.js';
import db from './indexcards/models/index.cjs';

import { debugLogger, requestLogger, errorLogger } from './indexcards/helpers/logger.js';

const app = express();

// Startup log message
debugLogger.info('Initializing API...');

// Enable Helmet security
app.use(helmet());

// Enable getting forwarded client IP from proxy
app.enable('trust proxy');


// Rate limit all requests
const limiter = rateLimiter({
	windowMs : config.RATE_WINDOW || 15 * 60 * 1000, // 15 minutes
	max      : config.RATE_MAX || 100000, // limit each IP to 100000 requests per windowMs
	delayMs  : config.RATE_DELAY || 0, // disable delaying - full speed until the max limit is reached
});
app.use(limiter);

// Enable CORS
app.use((req, res, next) => {
	// Can't use wildcard for CORS with credentials, so echo back the requesting domain
	const allowedOrigin = req.get('Origin') || '*';
	res.header('Access-Control-Allow-Origin', allowedOrigin);
	res.header('Access-Control-Allow-Credentials', true);
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
	res.header('Access-Control-Expose-Headers', 'Content-Disposition');
	next();
});

// Add a unique UUID to every request, and add the configuration for easy transport
app.use((req, res, next) => {
	req.uuid = uuid();
	req.config = config;
	return next();
});

// Log all requests
app.use(expressWinston.logger({
	winstonInstance: requestLogger,
	meta: true,
	dynamicMeta: (req, res) => {
		return {
			logCorrelationId: req.uuid,
		};
	},
}));

// Parse body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: ['json', 'application/*json'], limit: '10mb' }));
app.use(bodyParser.text({ type: '*/*', limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
	// Pretty print JSON in the dev environment
	app.use(bodyParser.json())
	app.set('json spaces', 4)
}

// Parse cookies and add them to the session
app.use(cookieParser());

// Database handle volleyball; don't have to call it in every last route.
// For I am lazy, and unapologetic.
app.use((req, res, next) => {
	req.db = db;
	return next();
});

// Authenticate against Tabroom cookie
app.all('/v1/user/*', async (req, res, next) => {
	req.session = await auth(req, res);
	next();
});

app.all('/v1/tourn/:tourn_id/*', async (req, res, next) => {

	req.session = await auth(req, res);
	req.session = await tournAuth(req, res);

	if (req.session && req.params) {

		if (req.session[req.params.tourn_id]
			&& req.session[req.params.tourn_id].level
		) {
			next();

		} else {
			return res.status(400).json({ message: 'You do not have admin access to that tournament' });
		}

	} else {
		return res.status(400).json({ message: 'You are not logged into Tabroom' });
	}

});

// Combine the various paths into one
const paths = [...tournPaths, ...userPaths, ...invitePaths, ...caselistPaths];

// Initialize OpenAPI middleware
const apiDocConfig = initialize({
	app,
	apiDoc,
	paths,
	promiseMode     : true,
	docsPath        : '/docs',
	errorMiddleware : errorHandler,
});

// Log global errors with Winston
app.use(expressWinston.errorLogger({
	winstonInstance: errorLogger,
	meta: true,
	dynamicMeta: (req, res, next) => {
		return {
			logCorrelationId: req.uuid,
		};
	},
}));

// Final fallback error handling
app.use(errorHandler);

// Swagger UI interface for the API
app.use('/v1/apidoc', swaggerUI.serve, swaggerUI.setup(apiDocConfig.apiDoc));

// Start server
const port = process.env.PORT || config.PORT || 9876;

app.listen(port, () => {
	debugLogger.info(`Server started. Listening on port ${port}`);
});

export default app;
