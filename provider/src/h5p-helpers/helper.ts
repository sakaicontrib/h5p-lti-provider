import * as H5P from '@lumieducation/h5p-server';
import H5PHtmlExporter from '@lumieducation/h5p-html-exporter';
import i18next from 'i18next';
import i18nextFsBackend from 'i18next-fs-backend';
import i18nextHttpMiddleware from 'i18next-http-middleware';
import path from 'path';

import createH5PEditor from './createH5PEditor';
import H5PUser from './h5pUser';
import H5PPermissionSystem from './h5pPermissionSystem';
import { CustomRequest } from '../CustomTypes';

export default async function createAllH5P(
	configPath: string,
	localLibraryPath: string,
	localContentPath: string,
	localTemporaryPath: string,
	localContentUserDataPath: string,
	localCorePath: string,
	localEditorPath: string
): Promise<{h5pConfig: H5P.H5PConfig, h5pEditor: H5P.H5PEditor, h5pPlayer: H5P.H5PPlayer, h5pUserInstancer: (provider) => H5PUser, htmlExporter: H5PHtmlExporter}> {

	const permissionSystem = new H5PPermissionSystem();
	
	//custom language detector based on LTI session locale
	const CustomDetector: i18nextHttpMiddleware.LanguageDetectorInterface = {
		name: 'myDetectorsName',
	
		lookup: function (req, res, options) {
			return (req as CustomRequest).session?.provider?.locale || 'en'
		}
	}

	const loadPath = (lng, namespace) => {
		let retPath = (namespace == 'frontend')
			? path.join(__dirname, '../../assets/translations/frontend/{{lng}}.json')
			: path.join(__dirname, '../../node_modules/@lumieducation/h5p-server/build/assets/translations/{{ns}}/{{lng}}.json');

		return retPath;
	}

	//custom language detector
	const lngDetector = new i18nextHttpMiddleware.LanguageDetector()
	lngDetector.addDetector(CustomDetector);

	const translationFunction = await i18next
			.use(i18nextFsBackend)
			.use(lngDetector) //custom LanguageDetector options provided in "init" method
			.init({
					backend: {
							loadPath: loadPath
					},
					debug: process.env.DEBUG && process.env.DEBUG.includes('i18n'),
					defaultNS: 'server',
					fallbackLng: 'en',
					ns: [
							'client',
							'copyright-semantics',
							'hub',
							'library-metadata',
							'metadata-semantics',
							'mongo-s3-content-storage',
							's3-temporary-storage',
							'server',
							'storage-file-implementations',
							'frontend'
					],
					preload: ['en'],
					//IMPORTANT: needed to detect language from LTI session
					detection: {
						order: ['myDetectorsName', /*'path', 'session', */'querystring', 'cookie', 'header']
					}
			});

	// Load the configuration file from the local file system
	const config = await new H5P.H5PConfig(
		new H5P.fsImplementations.JsonStorage(
			configPath
		)
	).load();

	// The H5PEditor object is central to all operations of h5p-nodejs-library
	// if you want to user the editor component.
	//
	// To create the H5PEditor object, we call a helper function, which
	// uses implementations of the storage classes with a local filesystem
	// or a MongoDB/S3 backend, depending on the configuration values set
	// in the environment variables.
	// In your implementation, you will probably instantiate H5PEditor by
	// calling new H5P.H5PEditor(...) or by using the convenience function
	// H5P.fs(...).
	const h5pEditor: H5P.H5PEditor = await createH5PEditor(
		config,
		permissionSystem,
		localLibraryPath,
		localContentPath,
		localTemporaryPath,
		localContentUserDataPath,
		(key, language) => translationFunction(key, { lng: language })
	);

	// The H5PPlayer object is used to display H5P content.
	const h5pPlayer = new H5P.H5PPlayer(
			h5pEditor.libraryStorage,
			h5pEditor.contentStorage,
			config,
			undefined,
			undefined,
			(key, language) => translationFunction(key, { lng: language }),
			{ 
				permissionSystem: permissionSystem,
				customization: {
					global: {
						scripts: ["/assets/js/xapi-send.js"]
					}
				}
			},
			h5pEditor.contentUserDataStorage
	);

	const htmlExporter = new H5PHtmlExporter(
			h5pEditor.libraryStorage,
			h5pEditor.contentStorage,
			config,
			localCorePath,
			localEditorPath
	);

	return {
		h5pConfig: config,
		h5pEditor: h5pEditor,
		h5pPlayer: h5pPlayer,
		h5pUserInstancer: H5PUser.instance,
		htmlExporter: htmlExporter
	};
}