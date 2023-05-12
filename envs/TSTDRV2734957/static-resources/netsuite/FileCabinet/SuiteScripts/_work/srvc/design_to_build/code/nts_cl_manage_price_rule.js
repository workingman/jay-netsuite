/**
 * Copyright (c) 1998-2018 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(
		[
				'N/currentRecord',
				'N/runtime',
				'N/search',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule',
				'N/ui/dialog' ],

		function(currentRecord, runtime, search, nts_md_manage_price_rule,
				dialog) {
			var PR_RECORD_ID = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_price_rule_record_id'
			});
			var CONTRACT = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_initial_price_rule'
			});
			var BEST_PRICE = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_initial_base_price_rule'
			});
			var SUILET_ID = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_override_sl'
			});
			var WARNING_MESSAGE = {
				tieredqty : runtime.getCurrentScript().getParameter({
					name : 'custscript_nts_tiered_qty_message'
				}),
				calculation : runtime.getCurrentScript().getParameter({
					name : 'custscript_nts_negative_calc_message'
				}),
			};

			var BASE_PRICE_LEVEL = -1;

			var CALC_METHOD = {
				fixed_price : 1,
				markup : 2,
				margin_plus : 3,
				list_less : 4,
				tiered_pricing : 5,
				promotion : 6
			};

			var CALC_METHOD_LC = {
				standard_cost : 1,
				average_cost : 2
			};

			var TIER_BASIS = {
				quantity : 1,
				amount : 2,
				weight : 3
			};

			/**
			 * This process is used to calculate the line item rate using
			 * pricing rules specific to the sales order recordâ€™s
			 * customer/item.
			 * 
			 * The process starts when the user adds a line item to a sales
			 * order
			 * 
			 * The system performs the following: Queries the price rule records
			 * using the following criteria: Customer OR Customer Group AND Item
			 * OR Item Category, Price rule type = â€˜Contractâ€™, Tran date >=
			 * Start Date, Tran date <= End Date, Ordered by last modified date
			 * 
			 * If a price rule is returned, the system performs the following:
			 * Sets the line item rate using the value returned from one of the
			 * following calculation methods specified on the price rule record:
			 * Fixed Price, Cost Plus, Margin Plus, List Less, Tiered Quantity.
			 * Sets the line itemâ€™s price level to â€˜Customâ€™ Otherwise, the
			 * system performs the following: Queries the price rule records
			 * using the following criteria: Customer OR Customer Group AND Item
			 * OR Item Category, Price rule type = â€˜Best Price, Tran date >=
			 * Start Date, Tran date <= End Date, Ordered by price rule record
			 * priority If a price rule is returned, the system performs the
			 * following: Sets the line item rate using the value returned from
			 * one of the following calculation methods specified on the price
			 * rule record with the highest priority: Fixed Price, Cost Plus,
			 * Margin Plus, List Less, Tiered Quantity. Sets the line itemâ€™s
			 * price level to â€˜Customâ€™
			 * 
			 * The user saves the sales order record
			 * 
			 * The process ends
			 */
			function validateLine(scriptContext) {
				try {
					if (runtime.executionContext == runtime.ContextType.USER_INTERFACE) {

						var override = scriptContext.currentRecord
								.getCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_nts_override_price_rule_cb'
								});

						var create_update = scriptContext.currentRecord
								.getCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_nts_create_update_fixed_price'
								});

						if ((!override) && (!create_update)) {
							var item_id = scriptContext.currentRecord
									.getCurrentSublistValue({
										sublistId : 'item',
										fieldId : 'item'
									});
							if (isEmpty(item_id)) {
								return true;
							} else {
								return item_pricing_realtime(scriptContext);
							}
						} else {
							if ((override)) {
								scriptContext.currentRecord
										.setCurrentSublistValue({
											sublistId : 'item',
											fieldId : 'custcol_nts_override_price_rule_cb',
											value : ''
										});
							}
							return true;
						}
					}
				} catch (e) {
					log.error(e.name, 'msg: ' + e.message + ' stack: '
							+ e.stack);
				}
			}

			/**
			 * While adding line items to a sales order, the user elects to
			 * override the custom price
			 * 
			 * The user performs the following: Sets the line itemâ€™s price
			 * rule override field to true Requests the system to present a list
			 * of price rules relevant to the customer and line itemâ€™ item
			 * 
			 * The system presents a list of price rules relevant to the
			 * customer and line itemâ€™ item
			 * 
			 * The user selects a price rule
			 * 
			 * The system performs the following: Sets the line item rate using
			 * the value returned from one of the following calculation methods
			 * specified on the price rule record with the highest priority:
			 * Fixed Price, Cost Plus, Margin Plus, List Less, Tiered Quantity
			 * 
			 * Sets the line itemâ€™s price level to â€˜Customâ€™
			 * 
			 * The flow continues at Item Pricing â€“ Real-time
			 */
			function fieldChanged(scriptContext) {

				if (scriptContext.sublistId == 'item') {
					if (scriptContext.fieldId == 'custcol_nts_show_price_rules_cb') {
						open_price_rule_sl(scriptContext);
					}
				}
			}

			/**
			 * This process is used to calculate the line item rate using
			 * pricing rules specific to the sales order recordâ€™s
			 * customer/item.
			 * 
			 * The process starts when the user adds a line item to a sales
			 * order
			 * 
			 * The system performs the following: Queries the price rule records
			 * using the following criteria: Customer OR Customer Group AND Item
			 * OR Item Category, Price rule type = â€˜Contractâ€™, Tran date >=
			 * Start Date, Tran date <= End Date, Ordered by last modified date
			 * 
			 * If a price rule is returned, the system performs the following:
			 * Sets the line item rate using the value returned from one of the
			 * following calculation methods specified on the price rule record:
			 * Fixed Price, Cost Plus, Margin Plus, List Less, Tiered Quantity.
			 * Sets the line itemâ€™s price level to â€˜Customâ€™ Otherwise, the
			 * system performs the following: Queries the price rule records
			 * using the following criteria: Customer OR Customer Group AND Item
			 * OR Item Category, Price rule type = â€˜Best Price, Tran date >=
			 * Start Date, Tran date <= End Date, Ordered by price rule record
			 * priority If a price rule is returned, the system performs the
			 * following: Sets the line item rate using the value returned from
			 * one of the following calculation methods specified on the price
			 * rule record with the highest priority: Fixed Price, Cost Plus,
			 * Margin Plus, List Less, Tiered Quantity. Sets the line itemâ€™s
			 * price level to â€˜Customâ€™
			 * 
			 * The user saves the sales order record
			 * 
			 * The process ends
			 */
			function postSourcing(scriptContext) {
				try {
					if (scriptContext.sublistId == 'item') {
						if (scriptContext.fieldId == 'item') {
							if (runtime.executionContext == runtime.ContextType.USER_INTERFACE) {
								var override = scriptContext.currentRecord
										.getCurrentSublistValue({
											sublistId : 'item',
											fieldId : 'custcol_nts_override_price_rule_cb'
										});
								var override = false;
								var create_update = scriptContext.currentRecord
										.getCurrentSublistValue({
											sublistId : 'item',
											fieldId : 'custcol_nts_create_update_fixed_price'
										});

								if ((!override) && (!create_update)) {
									var item_id = scriptContext.currentRecord
											.getCurrentSublistValue({
												sublistId : 'item',
												fieldId : 'item'
											});
									if (isEmpty(item_id)) {
										return true;
									} else {
										return item_pricing_realtime(scriptContext);
									}
								} else {
									if ((override)) {
										scriptContext.currentRecord
												.setCurrentSublistValue({
													sublistId : 'item',
													fieldId : 'custcol_nts_override_price_rule_cb',
													value : ''
												});
									}
									return true;
								}
							}
						}
					}
				} catch (e) {
					log.error(e.name, 'msg: ' + e.message + ' stack: '
							+ e.stack);
				}
			}

			/**
			 * Calculates the Rate based Price Rule details that have been found
			 * for the Customer AND Item, Sets the calculated Rate on the line.
			 * 
			 */
			function item_pricing_realtime(scriptContext) {
				if (scriptContext.sublistId == 'item') {
					var sales_order = scriptContext.currentRecord;

					var customer_id = sales_order.getValue('entity');
					var trandate = sales_order.getText('trandate');
					var item_id = sales_order.getCurrentSublistValue({
						sublistId : 'item',
						fieldId : 'item'
					});

					var loaded_cost = apply_loaded_costing(scriptContext);

					var price_rule = nts_md_manage_price_rule.get_price_rule(
							customer_id, trandate, item_id);

					if (!isEmpty(price_rule)) {
						var calc_method = price_rule.getValue({
							name : 'custrecord_nts_pr_calculation_method'
						});

						var flRate = '';

						var price_rule_json = {
							custrecord_nts_pr_markup_percent : price_rule
									.getValue({
										name : 'custrecord_nts_pr_markup_percent'
									}),
							custrecord_nts_pr_markup_amount : price_rule
									.getValue({
										name : 'custrecord_nts_pr_markup_amount'
									}),
							custrecord_nts_pr_fixed_price : price_rule
									.getValue({
										name : 'custrecord_nts_pr_fixed_price'
									}),
							custrecord_nts_pr_margin_percent : price_rule
									.getValue({
										name : 'custrecord_nts_pr_margin_percent'
									}),
							custrecord_nts_pr_discount_percent : price_rule
									.getValue({
										name : 'custrecord_nts_pr_discount_percent'
									}),
							custrecord_nts_pr_discount_amount : price_rule
									.getValue({
										name : 'custrecord_nts_pr_discount_amount'
									}),
							custrecord_nts_pr_calculation_basis : price_rule
									.getValue({
										name : 'custrecord_nts_pr_calculation_basis'
									}),
							custrecord_nts_pr_tier_basis : price_rule
									.getValue({
										name : 'custrecord_nts_pr_tier_basis'
									}),
							id : price_rule.id
						};

						var pricing_basis_json;

						var amount = parseFloat(sales_order
								.getCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'amount'
								}));

						pricing_basis_json = {
							quantity : sales_order.getCurrentSublistValue({
								sublistId : 'item',
								fieldId : 'quantity'
							}),
							amount : sales_order.getCurrentSublistValue({
								sublistId : 'item',
								fieldId : 'amount'
							})
						}

						if (calc_method == CALC_METHOD.promotion) {

							var calc_details = nts_md_manage_price_rule
									.promotion(price_rule_json,
											pricing_basis_json, item_id,
											loaded_cost, trandate, amount);

							if (isEmpty(calc_details)
									|| (JSON.stringify(calc_details) === '{}')) {

								sales_order.setCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'price',
									value : 1
								});
								sales_order.setCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_nts_so_promo_code',
									value : '',
								});
								return true;
							}

							handle_alt_promotion(calc_details, sales_order,
									pricing_basis_json);
						}

						if (calc_method == CALC_METHOD.tiered_pricing) {

							pricing_basis_json.weight = sales_order
									.getCurrentSublistValue({
										sublistId : 'item',
										fieldId : 'weightinlb'
									});

							var calc_details = nts_md_manage_price_rule
									.tiered_pricing(price_rule_json, item_id,
											loaded_cost, trandate, amount,
											pricing_basis_json);

							if (isEmpty(calc_details)
									|| (JSON.stringify(calc_details) === '{}')) {

								sales_order.setCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'price',
									value : 1
								});
								sales_order.setCurrentSublistValue({
									sublistId : 'item',
									fieldId : 'custcol_nts_so_promo_code',
									value : '',
								});
								return true;
							}

							handle_alt_promotion(calc_details, sales_order,
									pricing_basis_json);

						}

						if (calc_method == CALC_METHOD.fixed_price) {
							calc_details = nts_md_manage_price_rule
									.fixed_price(price_rule_json, item_id,
											loaded_cost, trandate, amount,
											pricing_basis_json);

							handle_alt_promotion(calc_details, sales_order,
									pricing_basis_json);

						}
						if (calc_method == CALC_METHOD.markup) {
							calc_details = nts_md_manage_price_rule.cost_plus(
									price_rule_json, item_id, loaded_cost,
									trandate, amount, pricing_basis_json);

							handle_alt_promotion(calc_details, sales_order,
									pricing_basis_json);
						}
						if (calc_method == CALC_METHOD.margin_plus) {
							calc_details = nts_md_manage_price_rule
									.margin_plus(price_rule_json, item_id,
											loaded_cost, trandate, amount,
											pricing_basis_json);

							handle_alt_promotion(calc_details, sales_order,
									pricing_basis_json);
						}
						if (calc_method == CALC_METHOD.list_less) {

							calc_details = nts_md_manage_price_rule.list_less(
									price_rule_json, item_id, loaded_cost,
									trandate, amount, pricing_basis_json);

							handle_alt_promotion(calc_details, sales_order,
									pricing_basis_json);

						}

						sales_order.setCurrentSublistValue({
							sublistId : 'item',
							fieldId : 'rate',
							value : parseFloat(calc_details.price),
						});
						if (!isEmpty(loaded_cost)) {
							sales_order.setCurrentSublistValue({
								sublistId : 'item',
								fieldId : 'costestimaterate',
								value : parseFloat(loaded_cost),
							});
							sales_order.setCurrentSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_nts_lc_costestimaterate',
								value : parseFloat(loaded_cost),
							});
						}
					} else {
						if (!isEmpty(loaded_cost)) {
							sales_order.setCurrentSublistValue({
								sublistId : 'item',
								fieldId : 'costestimaterate',
								value : parseFloat(loaded_cost),
							});
							sales_order.setCurrentSublistValue({
								sublistId : 'item',
								fieldId : 'custcol_nts_lc_costestimaterate',
								value : parseFloat(loaded_cost),
							});
						}
					}
				}
				return true;
			}

			function handle_alt_promotion(calc_details, sales_order,
					pricing_basis_json) {
				var promocode = calc_details.promocode;

				if (!isEmpty(promocode)) {
					var quantity = parseInt(calc_details.promoquantity)
							+ parseInt(pricing_basis_json.quantity);
					sales_order.setCurrentSublistValue({
						sublistId : 'item',
						fieldId : 'quantity',
						value : quantity,
					});
				}

				sales_order.setCurrentSublistValue({
					sublistId : 'item',
					fieldId : 'custcol_nts_so_promo_code',
					value : promocode,
				});

				sales_order.setCurrentSublistValue({
					sublistId : 'item',
					fieldId : 'price',
					value : BASE_PRICE_LEVEL
				});

				// sales_order.setCurrentSublistValue({
				// sublistId : 'item',
				// fieldId : 'custcol_nts_price_rule',
				// value : price_rule.id
				// });
			}

			function apply_loaded_costing(scriptContext) {
				var objSalesOrder = scriptContext.currentRecord;

				var customer = objSalesOrder.getValue({
					fieldId : 'entity'
				});

				var objLoadedCost;
				var itemId;
				var loaded_cost = null;

				itemId = objSalesOrder.getCurrentSublistValue({
					sublistId : 'item',
					fieldId : 'item'
				});

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
				var item;
				var item_group;
				var item_search;
				var item_filter;
				var item_results;
				var sales_rep;
				var lc_item_search;
				var lc_item_group;

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
							name : "custrecord_nts_lc_item_group",
							label : "Item Search"
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

						lc_item_group = results_array[i]
								.getValue('custrecord_nts_lc_item_group');

						lc_item_search = results_array[i]
								.getValue('custrecord_nts_lc_item_search');

						if (!isEmpty(lc_item_group)) {
							item_search = item_group_search(lc_item_group);
						}

						if (!isEmpty(lc_item_search)) {
							item_search = search.load(results_array[i]
									.getValue('custrecord_nts_lc_item_search'));
						}

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

			/**
			 * Initiates a SL with values to be used to search for the available
			 * to the Customer and Item Price Rules
			 */
			function open_price_rule_sl(scriptContext) {
				var stLogTitle = 'open_price_rule_sl ';
				try {
					var sales_order = scriptContext.currentRecord;
					var isSelected = sales_order.getCurrentSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_nts_show_price_rules_cb'
					});
					if (isSelected || (isSelected == 'T')) {
						var customer_id = sales_order.getValue('entity');
						var item_id = sales_order.getCurrentSublistValue({
							sublistId : 'item',
							fieldId : 'item'
						});
						var intQuantity = sales_order.getCurrentSublistValue({
							sublistId : 'item',
							fieldId : 'quantity'
						});
						var trandate = sales_order.getText('trandate');
						window.open('/app/site/hosting/scriptlet.nl?script='
								+ SUILET_ID + '&deploy=1' + '&customer='
								+ customer_id + '&item=' + item_id
								+ '&quantity=' + intQuantity + '&date='
								+ trandate, '_blank', "width=1280,height=1024");
					}
				} catch (e) {
					dialog.alert({
						title : 'Warning',
						message : e.message
					});
				}
			}

			function item_group_search(item_group) {
				var objSearch = search.create({
					type : "item",
					filters : [ [ "custitem_nts_adv_pricing_item_cat", "anyof",
							item_group ] ],
					columns : [ search.createColumn({
						name : "itemid",
						sort : search.Sort.ASC,
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
					}), search.createColumn({
						name : "custitem_am_production_unitstype",
						label : "Production Units Type"
					}), search.createColumn({
						name : "custitem_am_production_units",
						label : "Production Units"
					}), search.createColumn({
						name : "custitem_og_brand_field",
						label : "Brand"
					}), search.createColumn({
						name : "custitem_og_pack_size_field",
						label : "Order Guide Pack Size"
					}), search.createColumn({
						name : "custitem_atlas_item_planner",
						label : "Planner"
					}) ]
				});

				return objSearch;
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

			function isEmpty(stValue) {
				return ((stValue === '' || stValue == null || stValue == undefined)
						|| (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(
						v) {
					for ( var k in v) {
						return false;
					}
					return true;
				})(stValue)));
			}

			return {
				fieldChanged : null,
				validateLine : validateLine,
				postSourcing : postSourcing
			};

		});
