import * as dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand';

import { dir, DirectoryResult } from 'tmp-promise';
import express from 'express';
import helmet from "helmet";
import fileUpload from 'express-fileupload';
import i18next from 'i18next';
import i18nextHttpMiddleware from 'i18next-http-middleware';
import path from 'path';
import session from "express-session";

import * as redisInstance from './redis';
import ltiRouter from './lti/routes';
import {
		h5pAjaxExpressRouter,
		libraryAdministrationExpressRouter,
		contentTypeCacheExpressRouter
} from '@lumieducation/h5p-express';

import indexRenderer from './renderers/index';
import contentItemIndexRenderer from './renderers/contenItemIndex';
import h5pRoutes from './h5p-helpers/h5pRouter';

import { displayIps, clearTempFiles } from './utils';

import createAllH5P from './h5p-helpers/helper';
import { CustomRequest } from './CustomTypes';

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

let tmpDir: DirectoryResult;

const start = async (): Promise<void> => {
		const useTempUploads = process.env.TEMP_UPLOADS === 'true';
		if (useTempUploads) {
				tmpDir = await dir({ keep: false, unsafeCleanup: true });
		}

		const {h5pConfig, h5pEditor, h5pPlayer, h5pUserInstancer, htmlExporter} = await createAllH5P(
			path.join(__dirname, '../config.json'),
			path.join(__dirname, '../h5p/libraries'),
			path.join(__dirname, '../h5p/content'),
			path.join(__dirname, '../h5p/temporary-storage'),
			path.join(__dirname, '../h5p/user-data'),
			path.join(__dirname, '../h5p/core'),
			path.join(__dirname, '../h5p/editor')
		);

		// We now set up the Express server in the usual fashion.
		const server = express();

		const accepted_lti_consumers = (process.env.ACCEPTED_LTI_CONSUMERS) ? process.env.ACCEPTED_LTI_CONSUMERS.split(',') : [];
		server.use(helmet({
			xFrameOptions: false,
			contentSecurityPolicy: {
				useDefaults: false,
				directives: {
					"default-src": ["'self'", "'unsafe-inline'", "https://h5p.org", ...accepted_lti_consumers],
					"img-src": ["'self'", "data:", "https://h5p.org"],
					"font-src": ["'self'", "data:", "https://h5p.org"],
					"frame-ancestors": ["'self'", ...accepted_lti_consumers]
				},
			},
		}));


		const redisStore = redisInstance.getRedisSessionStore();
		// Initialized session info
		server.enable('trust proxy');
		server.use(
			session({
				store: redisStore,
				secret: process.env.SESSION_SECRET || "development",
				proxy: true,
				resave: false,
				saveUninitialized: true,
				cookie: { secure: true, httpOnly: false, sameSite: "none" }
			})
		);

		// allow static /assets
		server.use('/assets', express.static(path.join(__dirname, '../assets')));

		server.use(express.json({ limit: process.env.MAX_JSON_BODY_SIZE || '500mb' }));
		server.use(express.urlencoded({ extended: false }));

		// // The i18nextExpressMiddleware injects the function t(...) into the req
		// // object. This function must be there for the Express adapter
		// // (H5P.adapters.express) to function properly.
		server.use(i18nextHttpMiddleware.handle(i18next));

		// lti routes
		server.use("/", ltiRouter(h5pUserInstancer));
		
		// Configure file uploads
		server.use(
				fileUpload({
						limits: { fileSize: h5pEditor.config.maxTotalSize },
						useTempFiles: useTempUploads,
						tempFileDir: useTempUploads ? tmpDir?.path : undefined
				})
		);

		// delete temporary files left over from uploads
		if (useTempUploads) {
				server.use((req: express.Request & { files: any }, res, next) => {
						res.on('finish', async () => clearTempFiles(req));
						next();
				});
		}

		// // It is important that you inject a user object into the request object!
		// // The Express adapter below (H5P.adapters.express) expects the user
		// // object to be present in requests.
		server.use((
			req: CustomRequest,
			res,
			next
		) => {
			if(!req.session.user){
				return res.redirect("/application");
			} else { 
				req.user = req.session.user;
			}
			next();
		});

		// // The Express adapter handles GET and POST requests to various H5P
		// // endpoints. You can add an options object as a last parameter to configure
		// // which endpoints you want to use. In this case we don't pass an options
		// // object, which means we get all of them.
		server.use(
				h5pEditor.config.baseUrl,
				h5pAjaxExpressRouter(
						h5pEditor,
						path.resolve(path.join(__dirname, '../h5p/core')), // the path on the local disc where the
						// files of the JavaScript client of the player are stored
						path.resolve(path.join(__dirname, '../h5p/editor')), // the path on the local disc where the
						// files of the JavaScript client of the editor are stored
						undefined,
						'auto' // You can change the language of the editor here by setting
						// the language code you need here. 'auto' means the route will try
						// to use the language detected by the i18next language detector.
				)
		);

		// // The h5pRoutes are routes that create pages for these actions:
		// // - Creating new content
		// // - Editing content
		// // - Saving content
		// // - Deleting content
		server.use(
				h5pEditor.config.baseUrl,
				h5pRoutes(
						h5pEditor,
						h5pPlayer,
						'auto' // You can change the language of the editor by setting
						// the language code you need here. 'auto' means the route will try
						// to use the language detected by the i18next language detector.
				)
		);

		// // The LibraryAdministrationExpress routes are REST endpoints that offer
		// // library management functionality.
		server.use(
				`${h5pEditor.config.baseUrl}/libraries`,
				libraryAdministrationExpressRouter(h5pEditor)
		);

		// // The ContentTypeCacheExpress routes are REST endpoints that allow updating
		// // the content type cache manually.
		server.use(
				`${h5pEditor.config.baseUrl}/content-type-cache`,
				contentTypeCacheExpressRouter(h5pEditor.contentTypeCache)
		);

		server.get('/h5p/html/:contentId', async (req, res) => {
				const html = await htmlExporter.createSingleBundle(
						req.params.contentId,
						(req as any).user,
						{
								language: req.language ?? 'en',
								showLicenseButton: true
						}
				);
				res.setHeader(
						'Content-disposition',
						`attachment; filename=${req.params.contentId}.html`
				);
				res.status(200).send(html);
		});

		// // The startPageRenderer displays a list of content objects and shows
		// // buttons to display, edit, delete and download existing content.
		server.get('/', indexRenderer(h5pEditor));
		server.get('/ci', contentItemIndexRenderer(h5pEditor));

		server.use('/client', express.static(path.join(__dirname, 'client')));

		// // We only include the whole node_modules directory for convenience. Don't
		// // do this in a production app.
		// //TODO: remove me
		server.use(
				'/node_modules',
				express.static(path.join(__dirname, '../node_modules'))
		);

		// // Remove temporary directory on shutdown
		if (useTempUploads) {
				[
						'beforeExit',
						'uncaughtException',
						'unhandledRejection',
						'SIGQUIT',
						'SIGABRT',
						'SIGSEGV',
						'SIGTERM'
				].forEach((evt) =>
						process.on(evt, async () => {
								await tmpDir?.cleanup();
								tmpDir = null;
						})
				);
		}

		const port = process.env.PORT || '8080';

		// For developer convenience we display a list of IPs, the server is running
		// on. You can then simply click on it in the terminal.
		displayIps(port);

		server.listen(port);
};

// We can't use await outside a an async function, so we use the start()
// function as a workaround.

start();
