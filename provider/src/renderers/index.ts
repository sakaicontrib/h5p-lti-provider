import * as H5P from '@lumieducation/h5p-server';

import * as selectedItems from '../lti/selectedItems';
import { CustomRequest } from '../CustomTypes';

export default function render(
		editor: H5P.H5PEditor
): (req: CustomRequest, res: any) => any {
		return async (req, res) => {
				const contentIds = await editor.contentManager.listContent(req.user);
				const contentObjects = await Promise.all(
						contentIds.map(async (id) => ({
								content: await editor.contentManager.getContentMetadata(
										id,
										req.user
								),
								id
						}))
				);
				
				const selectedItem = await selectedItems.getSelectedItemId(req.session.context_id);

				const adminSection_body = (req.user.role == 'admin')
				? `<hr/>
					<div id="content-type-cache-container"></div>
					<hr/>
					<div id="library-admin-container"></div>`
				: '';

				const adminSection_script = (req.user.role == 'admin')
				? `
					<script>
							requirejs.config({
									baseUrl: "assets/js",
									paths: {
											react: '/node_modules/react/umd/react.development',
											"react-dom": '/node_modules/react-dom/umd/react-dom.development'
									}
							});
							requirejs([
									"react",
									"react-dom",
									"./client/LibraryAdminComponent.js",
									"./client/ContentTypeCacheComponent.js"], 
									function (React, ReactDOM, LibraryAdmin, ContentTypeCache) {
											const libraryAdminContainer = document.querySelector('#library-admin-container');
											ReactDOM.render(React.createElement(LibraryAdmin.default, { endpointUrl: 'h5p/libraries' }), libraryAdminContainer);
											const contentTypeCacheContainer = document.querySelector('#content-type-cache-container');
											ReactDOM.render(React.createElement(ContentTypeCache.default, { endpointUrl: 'h5p/content-type-cache' }), contentTypeCacheContainer);
									});                
					</script>`
				: '';

				res.send(`
				<!doctype html>
				<html>
				<head>
						<meta charset="utf-8">
					 
						<link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css">
						<link rel="stylesheet" href="/node_modules/@fortawesome/fontawesome-free/css/all.min.css">

						<script src="/node_modules/bootstrap/dist/js/bootstrap.min.js"></script>

						<!-- IMPORTANT: load after boostrap scripts or it will cause errors -->
						<script src="/node_modules/requirejs/require.js"></script>

						<script>
							window.onload = (event) => {
								//when delete/select button is clicked, get data-id from button and set data-contentid in confirm button
								const modalElem = document.getElementById('confirmModal');
								modalElem.addEventListener('show.bs.modal', function (e) {
									const id = e.relatedTarget.dataset.id;
									const target = e.relatedTarget.dataset.target;
									const target_msg = e.relatedTarget.dataset.targetmsg || target;

									//store data in confirm button
									const btn = document.getElementById('btnConfirm');
									btn.dataset.contentid = id;
									btn.dataset.target = target;
									
									//hide all messages
									modalElem.querySelectorAll('.msg_confirm').forEach((elem) => {
										elem.classList.add('d-none');
									});
									//show only targeted message
									modalElem.querySelector('#msg_confirm_'+target_msg).classList.remove('d-none');
								})
							};
							
							function doConfirm(btn){
								btn.href = \`${editor.config.baseUrl}/\${btn.dataset.target}/\${btn.dataset.contentid}\`;
								return true;
							}
						</script>

						<style>
							.selectedItem {
								color: orange;
							}
						</style>
				</head>
				<body>
						<div class="container-fluid">
								<h2>
										<span class="fa fa-file"></span> ${req.t("tit.existing_content", { ns: 'frontend' })}
								</h2>
								<a class="btn btn-primary my-2" href="${editor.config.baseUrl}/new">
									<span class="fa fa-plus-circle m-2"></span>${req.t("new_content", { ns: 'frontend' })}
								</a>
								<div class="list-group">
								${contentObjects
										.filter((obj) => obj?.content['contextId'] == req.session.context_id)
										.map(
											(content) =>
												`<div class="list-group-item">
													<div class="d-flex w-10">
														<div class="me-auto p-2 align-self-center">
															<a href="${editor.config.baseUrl}${editor.config.playUrl}/${content.id}">
																<h5>${content.content.title}</h5>
															</a>
															<div class="small d-flex">                                            
																<div class="me-2">
																	<span class="fa fa-book-open"></span>
																	${content.content.mainLibrary}
																</div>
																<div class="me-2">
																	<span class="fa fa-fingerprint"></span>
																	${content.id}
																</div>
															</div>
														</div>
														<div class="p-2">                                        
															<a class="btn btn-secondary" href="${editor.config.baseUrl}/edit/${content.id}">
																<span class="fa fa-pencil-alt m-1"></span>
																${req.t("edit", { ns: 'frontend' })}
															</a>
														</div>
														<div class="p-2">
															<a class="btn btn-info" href="${editor.config.baseUrl}${editor.config.downloadUrl}/${content.id}">
																<span class="fa fa-file-download m-1"></span>
																${req.t("download", { ns: 'frontend' })}
															</a>
														</div>
														<div class="p-2">
															<a class="btn btn-info" href="${editor.config.baseUrl}/html/${content.id}">
																<span class="fa fa-file-download m-1"></span>
																${req.t("download_html", { ns: 'frontend' })}
															</a>
														</div>
														<div class="p-2">
															<button type="button" class="btn btn-danger" data-id="${content.id}" data-target="delete" data-bs-toggle="modal" data-bs-target="#confirmModal">
																<span class="fa fa-trash-alt m-1"></span>
																${req.t("delete", { ns: 'frontend' })}
															</button>
														</div>
														<div class="p-2">
															<button type="button" title="${req.t((selectedItem && content.id == selectedItem) ? "unselect" : "select", { ns: 'frontend' })}" class="btn btn-light" data-id="${content.id}" data-target="select" ${(selectedItem && content.id == selectedItem) ? 'data-targetmsg="unselect"' : ''}  data-bs-toggle="modal" data-bs-target="#confirmModal">
																<span class="${(selectedItem && content.id == selectedItem) ? 'selectedItem fa-solid' : 'fa-regular'} fa-star m-1"></span>
															</button>
														</div>
													</div>
												</div>`
										)
										.join('')}
								</div>
								
								${adminSection_body}
						</div>

						<div class="modal fade" id="confirmModal" tabindex="-1" role="dialog" aria-labelledby="confirmModalLabel" aria-hidden="true">
							<div class="modal-dialog" role="document">
								<div class="modal-content">
									<div class="modal-header">
										<h5 class="modal-title" id="confirmModalLabel">${req.t("Confirm", { ns: 'frontend' })}</h5>
										<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${req.t("close", { ns: 'frontend' })}"></button>
									</div>
									<div class="modal-body">
										<span id="msg_confirm_delete" class="msg_confirm d-none">${req.t("msg.confirm_delete", { ns: 'frontend' })}</span>
										<span id="msg_confirm_select" class="msg_confirm d-none">${req.t("msg.confirm_select", { ns: 'frontend' })}</span>
										<span id="msg_confirm_unselect" class="msg_confirm d-none">${req.t("msg.confirm_unselect", { ns: 'frontend' })}</span>
									</div>
									<div class="modal-footer">
										<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${req.t("cancel", { ns: 'frontend' })}</button>
										<a id="btnConfirm" class="btn btn-primary" onclick="doConfirm(this)">${req.t("confirm", { ns: 'frontend' })}</a>
									</div>
								</div>
							</div>
						</div>

						${adminSection_script}
				</body>
				`);
		};
}
