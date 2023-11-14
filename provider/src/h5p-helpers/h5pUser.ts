import { IUser } from '@lumieducation/h5p-server';

/**
 * User object
 */
export default class H5PUser implements IUser {
		constructor(
			public id: string,
			public name: string,
			public email: string,
			// role is a custom property that is not required by the core; We can
			// use it in PermissionSystem to evaluate individual permission
			public role: 'anonymous' | 'teacher' | 'student' | 'admin'
		) {
				this.type = 'local';
		}

		public type: 'local';

		public static instance(provider): H5PUser {
			let role: 'anonymous' | 'teacher' | 'student' | 'admin' = 'anonymous';
			if(provider.admin === true){
				role = 'admin';
			} else if(provider.instructor === true || provider.manager === true || provider.ta === true) {
				role = 'teacher';
			} else if(provider.student === true || provider.alumni === true) {
				role = 'student';
			}

			let ret: H5PUser = new H5PUser(
				provider.userId,
				provider.username,
				provider.body.lis_person_contact_email_primary || '',
				role
			);
			return ret;
		}
}
