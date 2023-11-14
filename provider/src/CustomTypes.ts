import session from "express-session";
import { IRequestWithLanguage } from '@lumieducation/h5p-express';
import H5PUser from './h5p-helpers/h5pUser';


export type CustomUser = Partial<H5PUser>;
export type CustomProvider = { 
	is_launch: boolean,
	is_launch_ci: boolean,
	consumer_key: string,
	consumer_secret: string,
	signer: any,
	locale: string,
	body: {
		content_item_return_url?: string,
		data?: string,
		lis_outcome_service_url: string,
		lis_result_sourcedid: string,
		ext_outcome_data_values_accepted: string,
	},
};
export type CustomSession = session.Session & {user: H5PUser} & { provider: CustomProvider } & Partial<{ context_id: string, context_title: string }>;
export type CustomRequest = IRequestWithLanguage & { session: CustomSession } & { user: H5PUser };
