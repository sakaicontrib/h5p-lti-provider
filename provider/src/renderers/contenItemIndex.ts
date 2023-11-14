import * as H5P from '@lumieducation/h5p-server';
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

				if (!req.session.user) {
					return res.json({ success: false, error: "Invalid session" });
				}

				let baseUrl = process.env.SERVER_NAME || 'http://localhost:9090';

				res.send(`
				<!doctype html>
				<html>
				<head>
						<meta charset="utf-8">
						<link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css">
						<link rel="stylesheet" href="/node_modules/@fortawesome/fontawesome-free/css/all.min.css">

						<script src="/node_modules/bootstrap/dist/js/bootstrap.min.js"></script>

						<script>
							window.onload = (event) => {
								//when delete button is clicked, get data-id from button and set data-contentid in confirm button
								const modalElem = document.getElementById('confirmModal');
								modalElem.addEventListener('shown.bs.modal', function (e) {
									const id = e.relatedTarget.dataset.id;
									document.getElementById('btnConfirmDel').dataset.contentid = id;
								})
							};
							
							function doConfirm(btn){
								btn.href = "${editor.config.baseUrl}/delete/" + btn.dataset.contentid;
								return true;
							}

							function postResponse(id){
								const title = document.getElementById('tit_'+id).innerHTML;
								const description = document.getElementById('desc_'+id).innerHTML;
								let content_items = {
									"@context": "http://purl.imsglobal.org/ctx/lti/v1/ContentItem",
									"@graph": [
										{
											"@type": "LtiLinkItem",
											"@id": id,
											"url": "${baseUrl}/launch_lti_ci/"+id,
											"title": title,
											"text": description,
											"mediaType": "application/vnd.ims.lti.v1.ltilink",
											"placementAdvice": {
												"presentationDocumentTarget": "frame"
											}
										}
									]
								}

								let form = document.getElementById('post-form');
								form.querySelector('[name="data"]').value = JSON.stringify(${req.session.provider.body.data});
								form.querySelector('[name="content_items"]').value = JSON.stringify(content_items);
								form.submit();
							}
						</script>
				</head>
				<body>
						<form id='post-form' action='${req.session.provider.body.content_item_return_url}' method='POST'>
							<input type="hidden" name="lti_message_type" value="ContentItemSelection" />
							<input type="hidden" name="lti_version" value="LTI-1p0" />
							<input type="hidden" name="data" value="" />
							<input type="hidden" name="content_items" value="" />
						</form>

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
																<h5 id="tit_${content.id}">${content.content.title}</h5>
															</a>
															<div class="small d-flex">                                            
																<div class="me-2">
																	<span class="fa fa-book-open"></span>
																	<span id="desc_${content.id}">${content.content.mainLibrary}</span>
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
															<button type="button" class="btn btn-danger" data-id="${content.id}" data-bs-toggle="modal" data-bs-target="#confirmModal">
																<span class="fa fa-trash-alt m-1"></span>
																${req.t("delete", { ns: 'frontend' })}
															</button>
														</div>
														<div class="p-2">
															<span class="btn btn-success" onclick="postResponse('${content.id}')">
																<span class="fa fa-solid fa-file-import m-1"></span>
																${req.t("insert", { ns: 'frontend' })}
															</span>
														</div>
													</div>
												</div>`
										)
										.join('')}
								</div>
						</div>
						<div class="modal fade" id="confirmModal" tabindex="-1" role="dialog" aria-labelledby="confirmModalLabel" aria-hidden="true">
							<div class="modal-dialog" role="document">
								<div class="modal-content">
									<div class="modal-header">
										<h5 class="modal-title" id="confirmModalLabel">${req.t("Confirm", { ns: 'frontend' })}</h5>
										<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${req.t("close", { ns: 'frontend' })}"></button>
									</div>
									<div class="modal-body">
										${req.t("msg.confirm_delete", { ns: 'frontend' })}
									</div>
									<div class="modal-footer">
										<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${req.t("cancel", { ns: 'frontend' })}</button>
										<a id="btnConfirmDel" class="btn btn-primary" onclick="doConfirm(this)">${req.t("confirm", { ns: 'frontend' })}</a>
									</div>
								</div>
							</div>
						</div>
				</body>
				`);
		};
}
