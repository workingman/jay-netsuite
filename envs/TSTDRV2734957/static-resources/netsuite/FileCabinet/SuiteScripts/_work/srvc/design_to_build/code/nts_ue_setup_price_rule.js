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

					if (scriptContext.type == scriptContext.UserEventType.EDIT) {
						scriptContext.form
								.getField({
									id : 'custrecord_nts_pr_item'
								})
								.updateDisplayType(
										{
											displayType : serverWidget.FieldDisplayType.DISABLED
										});

						scriptContext.form
								.getField({
									id : 'name'
								})
								.updateDisplayType(
										{
											displayType : serverWidget.FieldDisplayType.DISABLED
										});
					}
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

					if (scriptContext.type == scriptContext.UserEventType.CREATE
							|| scriptContext.type == scriptContext.UserEventType.EDIT) {

						apply_name(scriptContext, price_rule);
						apply_priority(scriptContext, price_rule);
						calculate_price(scriptContext, price_rule);
					}

					var generate = price_rule.getValue({
						fieldId : 'custrecord_nts_pr_generate_mb_items'
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
					var price_rule = record.load({
						type : 'customrecord_nts_price_rule',
						id : scriptContext.newRecord.id,
						isDynamic : false
					});
					var generate = price_rule.getValue({
						fieldId : 'custrecord_nts_pr_generate_mb_items'
					})

					if (generate) {
						record.submitFields({
							type : 'customrecord_nts_price_rule',
							id : price_rule.id,
							values : {
								custrecord_nts_pr_generate_mb_items : false
							}
						});
						redirect.toRecord({
							type : 'customrecord_nts_price_rule',
							id : price_rule.id,
							isEditMode : true
						});
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function apply_name(scriptContext, priceRule) {
				priceRule.setValue({
					fieldId : 'name',
					value : item_name_search(priceRule.getValue({
						fieldId : 'custrecord_nts_pr_item'
					}))
				});
			}

			function apply_priority(scriptContext, priceRule) {
				var price_rule_type = priceRule.getValue({
					fieldId : 'custrecord_nts_pr_type'
				});

				if (price_rule_type == PR_TYPE.contract) {
					priceRule.setValue({
						fieldId : 'custrecord_nts_pr_priority',
						value : 1
					});
				}
				if (price_rule_type == PR_TYPE.affiliation) {
					priceRule.setValue({
						fieldId : 'custrecord_nts_pr_priority',
						value : 1
					});
				}

				if (price_rule_type == PR_TYPE.across_the_board) {
					priceRule.setValue({
						fieldId : 'custrecord_nts_pr_priority',
						value : 2
					});
				}
			}

			function calculate_price(scriptContext, priceRule) {
				var calc_details = {
					price : 0
				};

				var calcMethod = priceRule.getValue({
					fieldId : 'custrecord_nts_pr_calculation_method'
				});

				var customerId = priceRule.getValue({
					fieldId : 'custrecord_nts_pr_customer'
				});

				var itemId = priceRule.getValue({
					fieldId : 'custrecord_nts_pr_item'
				});

				var loaded_cost = apply_loaded_costing(customerId, itemId);

				var price_rule = {
					custrecord_nts_pr_markup_percent : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_markup_percent'
					}),
					custrecord_nts_pr_markup_amount : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_markup_amount'
					}),
					custrecord_nts_pr_fixed_price : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_fixed_price'
					}),
					custrecord_nts_pr_margin_percent : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_margin_percent'
					}),
					custrecord_nts_pr_discount_percent : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_discount_percent'
					}),
					custrecord_nts_pr_discount_amount : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_discount_amount'
					}),
					custrecord_nts_pr_calculation_basis : priceRule.getValue({
						fieldId : 'custrecord_nts_pr_calculation_basis'
					})
				};

				if (calcMethod == CALC_METHOD.fixed_price) {
					calc_details = nts_md_manage_price_rule
							.fixed_price(price_rule);
				} else if (calcMethod == CALC_METHOD.cost_plus) {
					calc_details = nts_md_manage_price_rule.cost_plus(
							price_rule, itemId, loaded_cost);
				} else if (calcMethod == CALC_METHOD.markup) {
					calc_details = nts_md_manage_price_rule.cost_plus(
							price_rule, itemId, loaded_cost);

				} else if (calcMethod == CALC_METHOD.margin_plus) {
					calc_details = nts_md_manage_price_rule.margin_plus(
							price_rule, itemId, loaded_cost);
				} else if (calcMethod == CALC_METHOD.list_less) {
					calc_details = nts_md_manage_price_rule.list_less(
							price_rule, itemId, loaded_cost);
				}

				priceRule.setValue({
					fieldId : 'custrecord_nts_pr_rate',
					value : calc_details.price,
					ignoreFieldChange : true
				});
			}

			function apply_loaded_costing(customer, itemId) {

				var objLoadedCost;
				var itemId;
				var loaded_cost = null;

				objLoadedCost = find_loaded_cost(itemId, customer);

				if (!isEmpty(objLoadedCost)) {
					loaded_cost = calculate_loaded_cost(objLoadedCost, itemId);
				}

				return loaded_cost;
			}

			function find_loaded_cost(itemId, customer) {
				var objLoadedCost = null;
				var results_array = [];
				var loaded_cost_filters;
				var item_search;
				var item_filter;
				var item_results;
				var sales_rep;

				var lookupFields = search
						.lookupFields({
							type : search.Type.CUSTOMER,
							id : customer,
							columns : [ 'custentity_nts_lc_customer_group',
									'salesrep' ]
						});

				if (lookupFields.salesrep.length > 0) {
					sales_rep = lookupFields.salesrep[0].value;
				}

				if (!isEmpty(sales_rep)) {
					var customer_group = lookupFields.custentity_nts_lc_customer_group;

					var lookupFields = search.lookupFields({
						type : search.Type.EMPLOYEE,
						id : sales_rep,
						columns : [ 'custentity_nts_sales_rep_group' ]
					});

					var sales_rep_group = lookupFields.custentity_nts_sales_rep_group;

					if (isEmpty(sales_rep_group) || sales_rep_group.length == 0) {
						if (isEmpty(customer_group)
								|| customer_group.length == 0) {
							loaded_cost_filters = [
									[ "isinactive", "is", "F" ],
									"AND",
									[ "custrecord_nts_lc_sales_rep", "anyof",
											sales_rep ],
									"AND",
									[ "custrecord_nts_lc_customer", "anyof",
											customer ] ]
						} else {
							loaded_cost_filters = [
									[ "isinactive", "is", "F" ],
									"AND",
									[ "custrecord_nts_lc_sales_rep", "anyof",
											sales_rep ],
									"AND",
									[ [ "custrecord_nts_lc_customer_group",
											"anyof", customer_group[0].value ] ] ]
						}
					} else {
						if (isEmpty(customer_group)
								|| customer_group.length == 0) {
							loaded_cost_filters = [
									[ "isinactive", "is", "F" ],
									"AND",
									[
											[ "custrecord_nts_lc_sales_rep",
													"anyof", sales_rep ],
											"OR",
											[
													"custrecord_nts_lc_sales_rep_group",
													"anyof",
													sales_rep_group[0].value ] ],
									"AND",
									[ "custrecord_nts_lc_customer", "anyof",
											customer ] ]
						} else {
							loaded_cost_filters = [
									[ "isinactive", "is", "F" ],
									"AND",
									[
											[ "custrecord_nts_lc_sales_rep",
													"anyof", sales_rep ],
											"OR",
											[
													"custrecord_nts_lc_sales_rep_group",
													"anyof",
													sales_rep_group[0].value ] ],
									"AND",
									[ "custrecord_nts_lc_customer_group",
											"anyof", customer_group[0].value ] ]
						}
					}

					var objSearch = search.create({
						type : "customrecord_nts_loaded_cost",
						filters : loaded_cost_filters,
						columns : [ search.createColumn({
							name : "name",
							sort : search.Sort.ASC,
							label : "Name"
						}), search.createColumn({
							name : "scriptid",
							label : "Script ID"
						}), search.createColumn({
							name : "custrecord_nts_lc_sales_rep",
							label : "Sales Rep"
						}), search.createColumn({
							name : "custrecord_nts_lc_sales_rep_group",
							label : "Sales Rep Group"
						}), search.createColumn({
							name : "custrecord_nts_lc_cost_pct",
							label : "Loaded Cost %"
						}), search.createColumn({
							name : "custrecord_nts_lc_cost_amt",
							label : "Loaded Cost $"
						}), search.createColumn({
							name : "custrecord_nts_lc_calc_method",
							label : "Calculation Method"
						}), search.createColumn({
							name : "custrecord_nts_lc_item_search",
							label : "Item Search"
						}), search.createColumn({
							name : "lastmodified",
							sort : search.Sort.ASC,
							label : "Last Modified"
						}) ]
					});

					results_array = results(objSearch);

					for (var i = 0; i < results_array.length; i++) {
						item_search = search.load(results_array[i]
								.getValue('custrecord_nts_lc_item_search'));

						item_filter = search.createFilter({
							name : "internalId",
							operator : "anyof",
							values : itemId
						});

						item_search.filters.push(item_filter);
						item_results = results(item_search);

						if (item_results.length > 0) {
							objLoadedCost = results_array[i];
							break;
						}
					}
				}

				return objLoadedCost;
			}

			function calculate_loaded_cost(objLoadedCost, itemId) {
				var loaded_cost = null;
				var calc_method = objLoadedCost
						.getValue('custrecord_nts_lc_calc_method');

				if (calc_method == CALC_METHOD_LC.standard_cost) {
					loaded_cost = standard_cost(objLoadedCost, itemId);
				}
				if (calc_method == CALC_METHOD_LC.average_cost) {
					loaded_cost = average_cost(objLoadedCost, itemId);
				}

				return loaded_cost;
			}

			function average_cost(objLoadedCost, itemId) {
				var flAverageCost = '';
				var nts_lc_cost_pct = objLoadedCost.getValue({
					name : 'custrecord_nts_lc_cost_pct'
				});
				var nts_lc_cost_amt = objLoadedCost.getValue({
					name : 'custrecord_nts_lc_cost_amt'
				});

				var base_rate = get_average_cost(itemId);

				if (!isEmpty(nts_lc_cost_pct)) {
					var flMarkup = parseFloat(nts_lc_cost_pct) / 100;
					flAverageCost = parseFloat(base_rate) * (1 + flMarkup);
				}

				if (!isEmpty(nts_lc_cost_amt)) {
					flAverageCost = flAverageCost + parseFloat(nts_lc_cost_amt);
				}

				return flAverageCost;
			}

			function get_average_cost(intItem) {
				var itemSearchObj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", intItem ], "AND",
							[ "pricing.pricelevel", "anyof", "1" ] ],
					columns : [ search.createColumn({
						name : "averagecost"
					}) ]
				});
				var searchObj = itemSearchObj.run().getRange(0, 1);

				return searchObj[0].getValue({
					name : "averagecost",
				}) || 0;
			}

			function standard_cost(objLoadedCost, itemId) {
				var flAverageCost = '';
				var nts_lc_cost_pct = objLoadedCost.getValue({
					name : 'custrecord_nts_lc_cost_pct'
				});
				var nts_lc_cost_amt = objLoadedCost.getValue({
					name : 'custrecord_nts_lc_cost_amt'
				});

				var base_rate = get_standard_cost(itemId);

				if (!isEmpty(nts_lc_cost_pct)) {
					var flMarkup = parseFloat(nts_lc_cost_pct) / 100;
					flAverageCost = parseFloat(base_rate) * (1 + flMarkup);
				}

				if (!isEmpty(nts_lc_cost_amt)) {
					flAverageCost = flAverageCost + parseFloat(nts_lc_cost_amt);
				}

				return flAverageCost;
			}

			function get_standard_cost(intItem) {
				var itemSearchObj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", intItem ], "AND",
							[ "pricing.pricelevel", "anyof", "1" ] ],
					columns : [ search.createColumn({
						name : "currentstandardcost"
					}) ]
				});
				var searchObj = itemSearchObj.run().getRange(0, 1);

				return searchObj[0].getValue({
					name : "currentstandardcost",
				}) || 0;
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
						name : 'custrecord_nts_mb_item'
					}));
				}

				var selected_uom = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_selected_uom'
				});
				var specified_threshold = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_specified_threshold'
				});
				var specified_item = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_specified_item'
				});
				var specified_item_group = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_specified_item_group'
				});
				var specified_item_search = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_specified_item_search'
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
						type : 'customrecord_nts_pr_min_basis'
					});

					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_price_rule',
						value : price_rule.id
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_uom',
						value : selected_uom
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_threshold',
						value : specified_threshold
					});
					min_basis_item.setValue({
						fieldId : 'custrecord_nts_mb_item',
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
					type : "customrecord_nts_pr_min_basis",
					filters : [ [ "custrecord_nts_mb_price_rule", "anyof",
							parent_id ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_mb_uom",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_mb_threshold",
						label : "Minimum Value"
					}), search.createColumn({
						name : "custrecord_nts_mb_item",
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
				beforeLoad : beforeLoad,
				beforeSubmit : beforeSubmit,
				afterSubmit : afterSubmit
			};

		});
