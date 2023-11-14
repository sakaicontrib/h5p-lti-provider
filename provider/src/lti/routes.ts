import express from 'express';
import { ltiLaunch } from './provider';
import * as ltiApi from './api';
import { CustomRequest } from '../CustomTypes';

export default function (h5pUserInstancer): express.Router {

	const router = express.Router();

	// Application page (default)
	router.get("/application", async (req: CustomRequest, res) => {
		if (req.session.user) {
			//this should not happen
			const html = `<div>User detected: ${req.session.user.name}</div>`;
			res.status(200).send(html);
		} else {
			const error = req.t("error.invalid_session", { ns: 'frontend' });
			res.status(403).send(error);
			return;
		}
	});

	// Route for launching LTI authentication and creating the provider instance
	router.post("/launch_lti", async (req: CustomRequest, res) => {
		return ltiLaunch(req, res, h5pUserInstancer);
	});
	router.post("/launch_lti_ci/:itemid", async (req: CustomRequest, res) => {
		return ltiLaunch(req, res, h5pUserInstancer, `/h5p/play/${req.params['itemid']}`);
	});

	//OUTCOME process
	router.get("/api/outcome", ltiApi.sendOutcome);

	return router;
};