/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[
				'N/error',
				'N/record',
				'N/runtime',
				'N/search',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule',
				'N/ui/serverWidget', 'N/url', 'N/redirect' ],

		function(error, record, runtime, search, nts_md_manage_price_rule,
				serverWidget, url, redirect) {

			var CALC_METHOD = {
				fixed_price : 1,
				markup : 2,
				margin_plus : 3,
				list_less : 4,
				tiered_qty : 5,
				promotion : 6
			};

			var PR_TYPE = {
				contract : 1,
				affiliation : 2,
				across_the_board : 3
			};

			var CALC_METHOD_LC = {
				standard_cost : 1,
				average_cost : 2
			};

			function beforeLoad(scriptContext) {
				try {

				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			/**
			 * The process is used to setup a price rule in terms of calculated
			 * price
			 */
			function beforeSubmit(scriptContext) {
				try {

					var price_rule = scriptContext.newRecord;

					if (scriptContext.type == scriptContext.UserEventType.EDIT) {

						var generate = price_rule
								.getValue({
									fieldId : 'custrecord_nts_pr_create_alt_gen_mb_item'
								})

						if (generate) {
							generate_mb_items(price_rule);
						}
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function afterSubmit(scriptContext) {
				try {
					var price_rule = record.load({
						type : 'customrecord_nts_alt_price_rule_create',
						id : scriptContext.newRecord.id,
						isDynamic : false
					});
					var generate = price_rule.getValue({
						fieldId : 'custrecord_nts_pr_create_alt_gen_mb_item'
					})

					if (generate) {
						record
								.submitFields({
									type : 'customrecord_nts_alt_price_rule_create',
									id : price_rule.id,
									values : {
										custrecord_nts_pr_create_alt_gen_mb_item : false
									}
								});
						redirect.toRecord({
							type : 'customrecord_nts_alt_price_rule_create',
							id : price_rule.id,
							isEditMode : true
						});
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function item_name_search(item_id) {
				var item_results;
				var item_result;
				var search_obj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", item_id ] ],
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

				item_results = results(search_obj);

				if (item_results.length > 0) {
					item_result = item_results[0].getValue({
						name : 'displayname'
					});
				}

				return item_result;
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

			function results(search_obj) {
				var results_array = [];
				var page = search_obj.runPaged({
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

			function generate_mb_items(price_rule) {

				var price_rule_min_basis_results = price_rule_min_basis_search(price_rule.id);

				var item_filter;
				var item_array = [];

				for (var i = 0; i < price_rule_min_basis_results.length; i++) {
					item_array.push(price_rule_min_basis_results[i].getValue({
						name : 'custrecord_nts_alt_mb_item_cr'
					}));
				}

				var selected_uom = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_create_sel_uom'
				});
				var specified_threshold = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_create_sp_threshol'
				});
				var specified_item = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_create_sp_item'
				});
				var specified_item_group = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_create_sp_item_gro'
				});
				var specified_item_search = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_create_sp_item_sea'
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
						filters = [ [ "custitem_nts_adv_pricing_item_cat",
								"anyof", specified_item_group ] ];
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
						type : 'customrecord_nts_alt_pr_min_basis_cr'
					});

					min_basis_item.setValue({
						fieldId : 'custrecord_nts_alt_price_rule_create',
						value : price_rule.id
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_alt_mb_uom_cr',
						value : selected_uom
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_alt_mb_threshold_cr',
						value : specified_threshold
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_alt_mb_item_cr',
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
					type : "customrecord_nts_alt_pr_min_basis_cr",
					filters : [ [ "custrecord_nts_alt_price_rule_create",
							"anyof", parent_id ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_uom_cr",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_threshold_cr",
						label : "Minimum Value"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_item_cr",
						label : "Min-Basis Item"
					}) ]
				});

				return results(search_obj);

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
