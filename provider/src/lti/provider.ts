// LTI Provider Initialisation
const lti = require("ims-lti");
import * as redisInstance from '../redis';
import { CustomRequest, CustomProvider } from '../CustomTypes';
import * as selectedItems from '../lti/selectedItems';

import i18next from 'i18next';

type toCustom = (is_launch_ci: boolean) => CustomProvider;

//override ims-lti Provider to allow ContentItemSelectionRequest request types
export class LTIProvider extends lti.Provider{

	constructor (consumer_key, consumer_secret, nonceStore, signature_method) {
		super(consumer_key, consumer_secret, nonceStore, signature_method)
	}

	_valid_parameters = (body) => {
		let correct_launch_message_type, correct_contentitem_message_type, correct_version, has_resource_link_id;
		if (!body) {
			return false;
		}
		correct_launch_message_type = body.lti_message_type === 'basic-lti-launch-request';
		correct_contentitem_message_type = body.lti_message_type === 'ContentItemSelectionRequest';
		correct_version = lti.supported_versions.indexOf(body.lti_version) !== -1;
		has_resource_link_id = body.resource_link_id != null;
		return correct_version && (correct_launch_message_type && has_resource_link_id) || correct_contentitem_message_type;
	};

	
	toCustomProvider: toCustom = (is_launch_ci) => {
		return { 
			is_launch: this.launch_request,
			is_launch_ci: is_launch_ci,
			consumer_key: this.consumer_key,
			consumer_secret: this.consumer_secret,
			signer: this.signer || lti.HMAC_SHA1,
			locale: this.body.launch_presentation_locale?.replace('_', '-') || 'en',
			body: {
				content_item_return_url: this.body.content_item_return_url,
				data: this.body.data,
				lis_outcome_service_url: this.body.lis_outcome_service_url,
				lis_result_sourcedid: this.body.lis_result_sourcedid,
				ext_outcome_data_values_accepted: this.body.ext_outcome_data_values_accepted,
			}
		}
	}
}

export const ltiLaunch = async (req: CustomRequest, res, h5pUserInstancer, redirectURL='') => {
	// Grab consumer key from request and oauth secret from envvars and use them to create a new LTI Provider instance
	const consumerKey = req.body.oauth_consumer_key;

	if (!consumerKey || consumerKey !== process.env.OAUTH_CONSUMER_KEY) {
		const error = `Invalid consumer key`;
		res.status(403).send(error);
		return;
	}

	const secret = process.env.OAUTH_SECRET;
	if (!secret) {
		const error = `Missing OAUTH_SECRET in env variables`;
		res.status(403).send(error);
		return;
	}

	const provider = new LTIProvider(
		consumerKey,
		secret,
		redisInstance.getRedisNonceStore(lti.Stores.RedisStore),
		lti.HMAC_SHA1
	);

	// Now initialise the provider by validating the request
	provider.valid_request(req, async (err, isValid) => {
		if (err) {
			const error = `Something went wrong: ${err}`;
			res.status(403).send(error);
			return;
		}
		if (isValid) {
				
			if(!h5pUserInstancer){
				const error = 'No User Instancer provided';
				res.status(403).send(error);
				return;
			}
			
			// Save some LTI Provider variables to the session
			let user = h5pUserInstancer(provider);

			req.session.user = user;
			req.session.context_id = provider.context_id;
			req.session.context_title = provider.context_title;
			req.session.provider = provider.toCustomProvider(!!redirectURL);

			if(!i18next.languages.includes(req.session.provider.locale)){
				await i18next.loadLanguages(req.session.provider.locale);
			}

			if(redirectURL){
				//this comes from an lti_launch_ci request -> play that content
				return res.redirect(redirectURL);
			} else if(user.role == 'admin' || user.role == 'teacher') {
				//admin and teachers are redirected to the index
				//check LTI message type to redirect one index or another
				if(provider.launch_request) {
					return res.redirect("/");
				} else {
					return res.redirect("/ci");
				}
			} else if(user.role == 'student') {
				//students will be redirected to selected item, if any, or to an error screen
				const selectedItem = await selectedItems.getSelectedItemId(provider.context_id);
				if(selectedItem){
					return res.redirect(`/h5p/play/${selectedItem}`);
				} else {
					//force language based on LTI locale
					req.i18n.changeLanguage(req.session.provider.locale);
					const html = `<div>${req.t('error.no_item_selected', { ns: 'frontend' })}</div>`;
					return res.status(200).send(html);
				}
			}
		} else {
			const error = `Invalid request`;
			res.status(403).send(error);
			return;
		}
	});
};
