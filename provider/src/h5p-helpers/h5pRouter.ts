import express from 'express';

import * as H5P from '@lumieducation/h5p-server';
import { IRequestWithUser } from '@lumieducation/h5p-express';

import { CustomRequest } from '../CustomTypes';
import editorRenderer from '../renderers/editor';
import playerRenderer from '../renderers/player';
import * as selectedItems from '../lti/selectedItems';

/**
 * @param h5pEditor
 * @param h5pPlayer
 * @param languageOverride the language to use. Set it to 'auto' to use the
 * language set by a language detector in the req.language property.
 * (recommended)
 */
export default function (
		h5pEditor: H5P.H5PEditor,
		h5pPlayer: H5P.H5PPlayer,
		languageOverride: string | 'auto' = 'auto'
): express.Router {
		const router = express.Router();

		router.get(
			`${h5pEditor.config.playUrl}/:contentId`,
			async (req: CustomRequest, res) => {
				try {
					const isTutor = (req.session.user.role == 'admin' || req.session.user.role == 'teacher');
					const h5pPage = await h5pPlayer
					.setRenderer(playerRenderer(req))
					.render(
						req.params.contentId,
						req.user,
						languageOverride === 'auto'
							? req.language ?? 'en'
							: languageOverride,
						{
							showFrame: isTutor,
							showCopyButton: isTutor,
							showDownloadButton: isTutor,
							showH5PIcon: isTutor,
							showLicenseButton: isTutor,
							showEmbedButton: false
						}
					);
					res.send(h5pPage);
					res.status(200).end();
				} catch (error) {
					res.status(500).end(error.message);
				}
			}
		);

		router.get(
			'/edit/:contentId',
			async (req: CustomRequest, res) => {
				const page = await h5pEditor
				.setRenderer(editorRenderer(req))
				.render(
					req.params.contentId,
					languageOverride === 'auto'
						? req.language ?? 'en'
						: languageOverride,
					req.user
				);
				res.send(page);
				res.status(200).end();
			}
		);

		router.post('/edit/:contentId', async (req: IRequestWithUser, res) => {
			const contentId = await h5pEditor.saveOrUpdateContent(
				req.params.contentId.toString(),
				req.body.params.params,
				req.body.params.metadata,
				req.body.library,
				req.user
			);

			res.send(JSON.stringify({ contentId }));
			res.status(200).end();
		});

		router.get(
			'/new',
			async (req: CustomRequest, res) => {
				const page = await h5pEditor
				.setRenderer(editorRenderer(req))
				.render(
					undefined,
					languageOverride === 'auto'
						? req.language ?? 'en'
						: languageOverride,
					req.user
				);
				res.send(page);
				res.status(200).end();
			}
		);

		router.post('/new', async (req: CustomRequest, res) => {
			if (
				!req.body.params ||
				!req.body.params.params ||
				!req.body.params.metadata ||
				!req.body.library ||
				!req.user
			) {
				return res.redirect(`${h5pEditor.config.baseUrl}/new?err=error.invalid_request`);
			}
			const metadata = req.body.params.metadata;
			if (req.session.context_id) {
				metadata.contextId = req.session.context_id;
			}
			const contentId = await h5pEditor.saveOrUpdateContent(
				undefined,
				req.body.params.params,
				metadata,
				req.body.library,
				req.user
			);

			res.send(JSON.stringify({ contentId }));
			res.status(200).end();
		});

		router.get('/delete/:contentId', async (req: CustomRequest & IRequestWithUser, res) => {
			try {
				await h5pEditor.deleteContent(req.params.contentId, req.user);
			} catch (error) {
				res.send( `${req.t('error.deleting_item', { contentId: req.params.contentId, ns: 'frontend' })}  <a href="${req.session.provider.is_launch ? '/' : '/ci'}">${req.t('back', { ns: 'frontend' })}</a>` );
				res.status(500).end();
				return;
			}
			if(req.session.provider.is_launch) {
				return res.redirect("/");
			} else {
				return res.redirect("/ci");
			}
		});

		router.get('/select/:contentId', async (req: CustomRequest, res) => {
			try {
				if (!req.session.user) {
					return res.json({ success: false, error: "Invalid session" });
				}
				if (!req.session.context_id) {
					return res.json({ success: false, error: "Invalid context_id" });
				}
				await selectedItems.saveSelectedItem(req.session.context_id, req.params.contentId);
			} catch (error) {
				res.send( `${req.t('error.selecting_item', { contentId: req.params.contentId, ns: 'frontend' })}  <a href="${req.session.provider.is_launch ? '/' : '/ci'}">${req.t('back', { ns: 'frontend' })}</a>` );
				res.status(500).end();
				return;
			}

			if(req.session.provider.is_launch) {
				return res.redirect("/");
			} else {
				return res.redirect("/ci");
			}
	});

	return router;
}
