import { IPlayerModel } from '@lumieducation/h5p-server';
import { CustomRequest } from '../CustomTypes';

export default (req: CustomRequest) => (model: IPlayerModel): string => {
	return `<!doctype html>
<html class="h5p-iframe">
<head>
    <meta charset="utf-8">
   
    ${model.styles
        .map((style) => `<link rel="stylesheet" href="${style}"/>`)
        .join('\n    ')}
    ${model.scripts
        .map((script) => `<script src="${script}"></script>`)
        .join('\n    ')}

		<link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css">
		<link rel="stylesheet" href="/node_modules/@fortawesome/fontawesome-free/css/all.min.css">

		<script>
      window.H5PIntegration = ${JSON.stringify(model.integration, null, 2)};
    </script>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div class="h5p-content" data-content-id="${model.contentId}"></div>
		${!req.session.provider.is_launch_ci && (req.session.user.role == 'admin' || req.session.user.role == 'teacher') ?
			`<div class="my-2">
				<a class="btn btn-primary" href="${req.session.provider.is_launch ? '/' : '/ci'}">${req.t('back', { ns: 'frontend' })}</a>
			</div>` : ''
		}
</body>
</html>`};
