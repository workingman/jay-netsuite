/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/redirect',
				'N/format', 'N/ui/serverWidget',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule' ],

		function(record, runtime, search, task, redirect, format, serverWidget,
				nts_md_manage_price_rule) {

			var APPLICATION = {
				create_on_customers : 1,
				update_on_customers : 2,
				create_deep_copy : 3,
				delete_price_rule_mgmt : 4
			};

			function beforeLoad(scriptContext) {
				try {

				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function beforeSubmit(scriptContext) {
				try {

					var price_rule = scriptContext.newRecord;

					var generate = price_rule.getValue({
						fieldId : 'custrecord_nts_pr_create_gen_mb_item'
					})

					if (generate) {
						generate_mb_items(price_rule);
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}

			}

			function afterSubmit(scriptContext) {
				try {
					var price_rule_create_id = scriptContext.newRecord.id;

					var price_rule_create = record.load({
						type : 'customrecord_nts_price_rule_create',
						id : price_rule_create_id
					});

					var create_application = price_rule_create.getValue({
						fieldId : 'custrecord_nts_price_rule_create_app'
					});
					var customer = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_customer'
					});
					var affiliation = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_affiliation'
					});
					var customer_search = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_customer_search'
					});

					var item = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_item'
					});
					var item_group = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_item_group'
					});
					var item_search = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_item_search'
					});

					if (!isEmpty(create_application)) {

						if (create_application == APPLICATION.create_on_customers) {

							apply_price_rule_create(price_rule_create_id,
									customer, affiliation, customer_search,
									item, item_group, item_search);
						}
						if (create_application == APPLICATION.update_on_customers) {

							apply_price_rule_update(price_rule_create_id,
									customer, affiliation, customer_search,
									item, item_group, item_search);
						}
						if (create_application == APPLICATION.create_deep_copy) {

							deep_copy_price_rule_create(price_rule_create_id);
						}

						log.debug('create_application', create_application);

						if (create_application == APPLICATION.delete_price_rule_mgmt) {

							delete_price_rule_mgmt(price_rule_create_id);
						}
					}

					var generate = price_rule_create.getValue({
						fieldId : 'custrecord_nts_pr_create_gen_mb_item'
					})

					record.submitFields({
						type : 'customrecord_nts_price_rule_create',
						id : price_rule_create.id,
						values : {
							custrecord_nts_pr_create_gen_mb_item : false,
							custrecord_nts_price_rule_create_app : null
						}
					});

					if (generate) {
						redirect.toRecord({
							type : 'customrecord_nts_price_rule_create',
							id : price_rule_create.id,
							isEditMode : true
						});
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}

			}

			function apply_price_rule_create(price_rule_create, customer,
					affiliation, customer_search, item, item_group, item_search) {

				var customer_method;
				var customer_input;
				var item_method;
				var item_input;

				if (!isEmpty(customer)) {
					customer_method = 'customer';
					customer_input = customer;
				}
				if (!isEmpty(affiliation)) {
					customer_method = 'affiliation';
					customer_input = affiliation;
				}
				if (!isEmpty(customer_search)) {
					customer_method = 'customer_search';
					customer_input = customer_search;
				}

				if (!isEmpty(item)) {
					item_method = 'item';
					item_input = item;
				}
				if (!isEmpty(item_group)) {
					item_method = 'item_group';
					item_input = item_group;
				}
				if (!isEmpty(item_search)) {
					item_method = 'item_search';
					item_input = item_search;
				}

				var scriptTask = task
						.create({
							taskType : task.TaskType.MAP_REDUCE,
							params : {
								custscript_nts_price_rule_create : price_rule_create,
								custscript_nts_create_customer_method : customer_method,
								custscript_nts_create_customer_input : customer_input,
								custscript_nts_create_item_method : item_method,
								custscript_nts_create_item_input : item_input
							}
						});

				scriptTask.scriptId = 'customscript_nts_mr_apply_pr_create';
				scriptTask.deploymentId = 'customdeploy_nts_mr_apply_pr_create';
				scriptTask.submit();

				redirect.toTaskLink({
					id : 'LIST_MAPREDUCESCRIPTSTATUS',
					parameters : {
						'sortcol' : 'dcreated',
						'sortdir' : 'DESC',
						'datemodi' : 'WITHIN',
						'daterange' : 'TODAY',
						'datefrom' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'dateto' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'date' : 'TODAY',
						'scripttype' : 1563,
						'primarykey' : ''
					}
				});
			}

			function apply_price_rule_update(price_rule_create, customer,
					affiliation, customer_search, item, item_group, item_search) {

				var customer_method;
				var customer_input;
				var item_method;
				var item_input;

				if (!isEmpty(customer)) {
					customer_method = 'customer';
					customer_input = customer;
				}
				if (!isEmpty(affiliation)) {
					customer_method = 'affiliation';
					customer_input = affiliation;
				}
				if (!isEmpty(customer_search)) {
					customer_method = 'customer_search';
					customer_input = customer_search;
				}

				if (!isEmpty(item)) {
					item_method = 'item';
					item_input = item;
				}
				if (!isEmpty(item_group)) {
					item_method = 'item_group';
					item_input = item_group;
				}
				if (!isEmpty(item_search)) {
					item_method = 'item_search';
					item_input = item_search;
				}

				var scriptTask = task
						.create({
							taskType : task.TaskType.MAP_REDUCE,
							params : {
								custscript_nts_price_rule_update : price_rule_create,
								custscript_nts_update_customer_method : customer_method,
								custscript_nts_update_customer_input : customer_input,
								custscript_nts_update_item_method : item_method,
								custscript_nts_update_item_input : item_input
							}
						});

				scriptTask.scriptId = 'customscript_nts_mr_apply_pr_update';
				scriptTask.deploymentId = 'customdeploy_nts_mr_apply_pr_update';
				scriptTask.submit();

				redirect.toTaskLink({
					id : 'LIST_MAPREDUCESCRIPTSTATUS',
					parameters : {
						'sortcol' : 'dcreated',
						'sortdir' : 'DESC',
						'datemodi' : 'WITHIN',
						'daterange' : 'TODAY',
						'datefrom' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'dateto' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'date' : 'TODAY',
						'scripttype' : 1565,
						'primarykey' : ''
					}
				});
			}

			function deep_copy_price_rule_create(price_rule_create) {

				var scriptTask = task.create({
					taskType : task.TaskType.MAP_REDUCE,
					params : {
						custscript_nts_price_rule_create_dc : price_rule_create
					}
				});

				scriptTask.scriptId = 'customscript_nts_mr_deep_copy_pr_create';
				scriptTask.deploymentId = 'customdeploy_nts_mr_deep_copy_pr_create';
				scriptTask.submit();

				redirect.toTaskLink({
					id : 'LIST_MAPREDUCESCRIPTSTATUS',
					parameters : {
						'sortcol' : 'dcreated',
						'sortdir' : 'DESC',
						'datemodi' : 'WITHIN',
						'daterange' : 'TODAY',
						'datefrom' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'dateto' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'date' : 'TODAY',
						'scripttype' : 1862,
						'primarykey' : ''
					}
				});
			}

			function delete_price_rule_mgmt(price_rule_create) {

				var scriptTask = task
						.create({
							taskType : task.TaskType.MAP_REDUCE,
							params : {
								custscript_nts_price_rule_delete_pr_crea : price_rule_create
							}
						});

				scriptTask.scriptId = 'customscript_nts_mr_delete_pr_create';
				scriptTask.deploymentId = 'customdeploy_nts_mr_delete_pr_create';
				scriptTask.submit();

				redirect.toTaskLink({
					id : 'LIST_MAPREDUCESCRIPTSTATUS',
					parameters : {
						'sortcol' : 'dcreated',
						'sortdir' : 'DESC',
						'datemodi' : 'WITHIN',
						'daterange' : 'TODAY',
						'datefrom' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'dateto' : format.format({
							value : new Date(),
							type : format.Type.DATE
						}),
						'date' : 'TODAY',
						'scripttype' : 1863,
						'primarykey' : ''
					}
				});
			}

			function generate_mb_items(price_rule) {

				var price_rule_min_basis_results = price_rule_min_basis_search(price_rule.id);

				var item_filter;
				var item_array = [];

				for (var i = 0; i < price_rule_min_basis_results.length; i++) {
					item_array.push(price_rule_min_basis_results[i].getValue({
						name : 'custrecord_nts_mb_item_cr'
					}));
				}

				var selected_uom = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_sel_uom'
				});
				var specified_threshold = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_sp_threshol'
				});
				var specified_item = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_sp_item'
				});
				var specified_item_group = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_sp_item_gro'
				});
				var specified_item_search = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_sp_item_sea'
				});

				var filters;
				var item_results;

				if (!isEmpty(specified_item)) {
					if (item_array.length > 0) {
						item_filter = [ "internalid", "noneof" ];
						for (var i = 0; i < item_array.length; i++) {
							item_filter.push(item_array[i]);
						}
					}

					if (isEmpty(item_filter)) {
						filters = [ [ "internalid", "anyof", specified_item ] ];
					} else {
						filters = [ [ "internalid", "anyof", specified_item ],
								'AND', item_filter ];
					}

					item_results = item_search(filters);

				}
				if (!isEmpty(specified_item_group)) {
					if (item_array.length > 0) {
						item_filter = [ "internalid", "noneof" ];
						for (var i = 0; i < item_array.length; i++) {
							item_filter.push(item_array[i]);
						}
					}

					if (isEmpty(item_filter)) {
						filters = [ [ "custitem_nts_adv_pricing_item_cat", "anyof",
								specified_item_group ] ];
					} else {
						filters = [
								[ "custitem_nts_adv_pricing_item_cat", "anyof",
										specified_item_group ], 'AND',
								item_filter ]
					}

					item_results = item_search(filters);

				}
				if (!isEmpty(specified_item_search)) {

					var search_obj = search.load({
						id : specified_item_search
					});

					if (item_array.length > 0) {
						item_filter = search.createFilter({
							name : 'internalid',
							operator : search.Operator.NONEOF,
							values : item_array
						});
						search_obj.filters.push(item_filter);
					}

					item_results = results(search_obj);

				}

				var min_basis_item;

				for (var i = 0; i < item_results.length; i++) {
					min_basis_item = record.create({
						type : 'customrecord_nts_pr_min_basis_cr'
					});

					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_price_rule_cr',
						value : price_rule.id
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_uom_cr',
						value : selected_uom
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_threshold_cr',
						value : specified_threshold
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_item_cr',
						value : item_results[i].id
					});

					min_basis_item.setValue({
						fieldId : 'name',
						value : item_results[i].getValue({
							name : 'displayname'
						})
					});

					min_basis_item.save();
				}
			}

			function price_rule_min_basis_search(parent_id) {
				var search_obj = search.create({
					type : "customrecord_nts_pr_min_basis_cr",
					filters : [ [ "custrecord_nts_mb_price_rule_cr", "anyof",
							parent_id ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_mb_uom_cr",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_mb_threshold_cr",
						label : "Minimum Value"
					}), search.createColumn({
						name : "custrecord_nts_mb_item_cr",
						label : "Min-Basis Item"
					}) ]
				});

				return results(search_obj);

			}

			function item_search(filters) {
				var search_obj = search.create({
					type : "item",
					filters : filters,
					columns : [ search.createColumn({
						name : "itemid",
						label : "Name"
					}), search.createColumn({
						name : "displayname",
						label : "Display Name"
					}), search.createColumn({
						name : "salesdescription",
						label : "Description"
					}), search.createColumn({
						name : "type",
						label : "Type"
					}), search.createColumn({
						name : "baseprice",
						label : "Base Price"
					}) ]
				});

				return results(search_obj);
			}

			function results(objSearch) {
				var results_array = [];
				var page = objSearch.runPaged({
					pageSize : 4000
				});

				for (var i = 0; i < page.pageRanges.length; i++) {
					var pageRange = page.fetch({
						index : page.pageRanges[i].index
					});
					results_array = results_array.concat(pageRange.data);
				}

				return results_array;
			}

			function isEmpty(value) {
				if (value === null) {
					return true;
				} else if (value === undefined) {
					return true;
				} else if (value === '') {
					return true;
				} else if (value === ' ') {
					return true;
				} else if (value === 'null') {
					return true;
				} else {
					return false;
				}
			}

			return {
				beforeLoad : null,
				beforeSubmit : beforeSubmit,
				afterSubmit : afterSubmit
			};

		});
