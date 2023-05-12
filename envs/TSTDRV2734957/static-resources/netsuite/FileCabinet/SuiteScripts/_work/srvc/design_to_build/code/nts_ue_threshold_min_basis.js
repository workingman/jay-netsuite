/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule' ],

		function(record, runtime, search, nts_md_manage_price_rule) {

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

			function beforeLoad(scriptContext) {

			}

			function beforeSubmit(scriptContext) {

			}

			function afterSubmit(scriptContext) {
				try {
					if (scriptContext.type != scriptContext.UserEventType.DELETE) {
						threshold_min_basis(scriptContext);
					}
				} catch (e) {
					log.error(e.name, 'msg: ' + e.message + ' stack: '
							+ e.stack);
				}
			}

			/**
			 * 
			 */
			function threshold_min_basis(scriptContext) {
				var sales_order = record.load({
					type : record.Type.SALES_ORDER,
					id : scriptContext.newRecord.id,
					isDynamic : false
				});

				var customer_id = sales_order.getValue('entity');
				var trandate = sales_order.getText('trandate');

				var sales_order_line_results = sales_order_line_search(sales_order.id);
				var sales_order_line_result;
				var min_basis_filter;
				var min_basis_items_filter = [];
				var min_basis_item_filter;

				var alt_min_basis_items_filter = [];
				var alt_min_basis_item_filter;

				for (var i = 0; i < sales_order_line_results.length; i++) {
					min_basis_item_filter = [];
					alt_min_basis_item_filter = [];
					sales_order_line_result = sales_order_line_results[i];

					min_basis_item_filter.push([ "custrecord_nts_mb_uom",
							"anyof", sales_order_line_result.getValue({
								name : 'unitstype',
								join : 'item'
							}) ]);

					alt_min_basis_item_filter.push([
							"custrecord_nts_alt_mb_uom", "anyof",
							sales_order_line_result.getValue({
								name : 'unitstype',
								join : 'item'
							}) ]);

					min_basis_item_filter.push("AND");
					alt_min_basis_item_filter.push("AND");

					min_basis_item_filter.push([ "custrecord_nts_mb_threshold",
							"lessthanorequalto",
							sales_order_line_result.getValue({
								name : 'quantity'
							}) ]);
					alt_min_basis_item_filter.push([
							"custrecord_nts_alt_mb_threshold",
							"lessthanorequalto",
							sales_order_line_result.getValue({
								name : 'quantity'
							}) ]);

					min_basis_item_filter.push("AND");
					alt_min_basis_item_filter.push("AND");

					min_basis_item_filter.push([
							"custrecord_nts_mb_item.internalid", "anyof",
							sales_order_line_result.getValue({
								name : 'item'
							}) ]);

					alt_min_basis_item_filter.push([
							"custrecord_nts_alt_mb_item.internalid", "anyof",
							sales_order_line_result.getValue({
								name : 'item'
							}) ]);

					min_basis_items_filter.push(min_basis_item_filter);
					alt_min_basis_items_filter.push(alt_min_basis_item_filter);

					if (i < sales_order_line_results.length - 1) {
						min_basis_items_filter.push("OR");
						alt_min_basis_items_filter.push("OR");
					}
				}

				var price_rule;
				var alt_price_rule;
				var item_id;
				var quantity;
				var units;
				var min_basis_results;

				var line_count = sales_order.getLineCount({
					sublistId : 'item'
				});

				var sales_order_changed = false;
				var item_filter;
				var sales_order_min_value_result;

				for (var i = 0; i < line_count; i++) {

					item_id = sales_order.getSublistValue({
						sublistId : 'item',
						fieldId : 'item',
						line : i
					});

					price_rule = nts_md_manage_price_rule.get_price_rule(
							customer_id, trandate, item_id);

					if (!isEmpty(price_rule)) {

						alt_price_rule = nts_md_manage_price_rule
								.get_alt_price_rule(price_rule.id, trandate);

						if (!isEmpty(alt_price_rule)) {
							min_basis_filter = [];
							min_basis_filter
									.push([
											"custrecord_nts_alt_mb_price_rule.internalid",
											"anyof", alt_price_rule.id ]);
							min_basis_filter.push("AND");
							min_basis_filter.push(alt_min_basis_items_filter);

							min_basis_results = alt_min_basis_search(min_basis_filter);

							if (min_basis_results.length > 0) {

								item_filter = [ "item", "anyof" ];
								for (var j = 0; j < min_basis_results.length; j++) {
									item_filter
											.push(min_basis_results[j]
													.getValue({
														name : 'custrecord_nts_alt_mb_item'
													}));
								}

								sales_order_min_value_results = sales_order_min_value_search(
										sales_order.id, item_filter);

								if (sales_order_min_value_results.length > 0) {

									sales_order_min_value = sales_order_min_value_results[0]
											.getValue({
												name : 'quantity',
												summary : "GROUP"
											})

									if (sales_order_min_value >= alt_price_rule
											.getValue({
												name : 'custrecord_nts_alt_pr_specified_threshol'
											})) {
										apply_alt_price_rule(alt_price_rule, i,
												sales_order, scriptContext);
										sales_order_changed = true;
									}
								}
							}
						} else {
							if (!isEmpty(price_rule)) {
								min_basis_filter = [];
								min_basis_filter
										.push([
												"custrecord_nts_mb_price_rule.internalid",
												"anyof", price_rule.id ]);
								min_basis_filter.push("AND");
								min_basis_filter.push(min_basis_items_filter);

								min_basis_results = min_basis_search(min_basis_filter);

								if (min_basis_results.length > 0) {
									item_filter = [ "item", "anyof" ];
									for (var j = 0; j < min_basis_results.length; j++) {
										item_filter
												.push(min_basis_results[j]
														.getValue({
															name : 'custrecord_nts_mb_item'
														}));
									}

									sales_order_min_value_results = sales_order_min_value_search(
											sales_order.id, item_filter);

									if (sales_order_min_value_results.length > 0) {

										sales_order_min_value = sales_order_min_value_results[0]
												.getValue({
													name : 'quantity',
													summary : "GROUP"
												})

										if (sales_order_min_value >= price_rule
												.getValue({
													name : 'custrecord_nts_pr_specified_threshold'
												})) {
											apply_price_rule(price_rule, i,
													sales_order, scriptContext);
											sales_order_changed = true;
										}
									}
								}
							}
						}
					}
				}

				if (sales_order_changed) {
					sales_order.save();
				}
			}

			function apply_price_rule(price_rule, line, sales_order,
					scriptContext) {

				var customer_id = sales_order.getValue('entity');
				var trandate = sales_order.getText('trandate');
				var item_id = sales_order.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : line
				});

				var loaded_cost = apply_loaded_costing(scriptContext, line);
				var calc_method = price_rule.getValue({
					name : 'custrecord_nts_pr_calculation_method'
				});

				var flRate = '';

				var price_rule_json = {
					custrecord_nts_pr_markup_percent : price_rule.getValue({
						name : 'custrecord_nts_pr_markup_percent'
					}),
					custrecord_nts_pr_markup_amount : price_rule.getValue({
						name : 'custrecord_nts_pr_markup_amount'
					}),
					custrecord_nts_pr_fixed_price : price_rule.getValue({
						name : 'custrecord_nts_pr_fixed_price'
					}),
					custrecord_nts_pr_margin_percent : price_rule.getValue({
						name : 'custrecord_nts_pr_margin_percent'
					}),
					custrecord_nts_pr_discount_percent : price_rule.getValue({
						name : 'custrecord_nts_pr_discount_percent'
					}),
					custrecord_nts_pr_discount_amount : price_rule.getValue({
						name : 'custrecord_nts_pr_discount_amount'
					}),
					custrecord_nts_pr_calculation_basis : price_rule.getValue({
						name : 'custrecord_nts_pr_calculation_basis'
					}),
					custrecord_nts_pr_tier_basis : price_rule.getValue({
						name : 'custrecord_nts_pr_tier_basis'
					}),
					id : price_rule.id
				};

				var pricing_basis_json;

				var amount = parseFloat(sales_order.getSublistValue({
					sublistId : 'item',
					fieldId : 'amount',
					line : line
				}));

				if (calc_method == CALC_METHOD.promotion) {

					pricing_basis_json = {
						quantity : sales_order.getSublistValue({
							sublistId : 'item',
							fieldId : 'quantity',
							line : line
						})
					}

					var calc_details = nts_md_manage_price_rule.promotion(
							price_rule_json, pricing_basis_json, item_id,
							loaded_cost, trandate, amount);

					if (isEmpty(calc_details)
							|| (JSON.stringify(calc_details) === '{}')) {

						sales_order.setSublistValue({
							sublistId : 'item',
							fieldId : 'price',
							value : 1,
							line : line
						});
						sales_order.setSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_nts_so_promo_code',
							value : '',
							line : line
						});
						return;
					}
				}

				if (calc_method == CALC_METHOD.tiered_pricing) {

					pricing_basis_json = {
						quantity : sales_order.getSublistValue({
							sublistId : 'item',
							fieldId : 'quantity',
							line : line
						}),
						amount : sales_order.getSublistValue({
							sublistId : 'item',
							fieldId : 'amount',
							line : line
						}),
						weight : sales_order.getSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_atlas_line_item_weight',
							line : line
						})

					};

					var calc_details = nts_md_manage_price_rule.tiered_pricing(
							price_rule_json, item_id, loaded_cost, trandate,
							amount, pricing_basis_json);

					if (isEmpty(calc_details)
							|| (JSON.stringify(calc_details) === '{}')) {

						sales_order.setSublistValue({
							sublistId : 'item',
							fieldId : 'price',
							value : 1,
							line : line
						});
						sales_order.setSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_nts_so_promo_code',
							value : '',
							line : line
						});
						return;
					}
				}

				if (calc_method == CALC_METHOD.fixed_price) {
					calc_details = nts_md_manage_price_rule.fixed_price(
							price_rule_json, item_id, loaded_cost, trandate,
							amount);
				}
				if (calc_method == CALC_METHOD.markup) {
					calc_details = nts_md_manage_price_rule.cost_plus(
							price_rule_json, item_id, loaded_cost, trandate,
							amount);
				}
				if (calc_method == CALC_METHOD.margin_plus) {
					calc_details = nts_md_manage_price_rule.margin_plus(
							price_rule_json, item_id, loaded_cost, trandate,
							amount);
				}
				if (calc_method == CALC_METHOD.list_less) {
					calc_details = nts_md_manage_price_rule.list_less(
							price_rule_json, item_id, loaded_cost, trandate,
							amount);
				}

				if (!isEmpty(calc_details.price)) {
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'rate',
						value : parseFloat(calc_details.price),
						line : line
					});

					handle_alt_promotion(calc_details, line, sales_order,
							pricing_basis_json);
				}
				if (!isEmpty(loaded_cost)) {
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'costestimaterate',
						value : parseFloat(loaded_cost),
						line : line
					});
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_nts_lc_costestimaterate',
						value : parseFloat(loaded_cost),
						line : line
					});
				}

			}

			function apply_alt_price_rule(alt_price_rule, line, sales_order,
					scriptContext) {

				var customer_id = sales_order.getValue('entity');
				var trandate = '';
				var item_id = sales_order.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : line
				});

				var loaded_cost = apply_loaded_costing(scriptContext, line);
				var calc_method = alt_price_rule.getValue({
					name : 'custrecord_nts_alt_pr_calculation_method'
				});

				var pricing_basis_json = {
					quantity : sales_order.getSublistValue({
						sublistId : 'item',
						fieldId : 'quantity',
						line : line
					}),
					amount : sales_order.getSublistValue({
						sublistId : 'item',
						fieldId : 'amount',
						line : line
					}),
					weight : sales_order.getSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_atlas_line_item_weight',
						line : line
					})

				};

				var amount = parseFloat(sales_order.getSublistValue({
					sublistId : 'item',
					fieldId : 'amount',
					line : line
				}));

				var calc_details = nts_md_manage_price_rule.alt_item_pricing(
						alt_price_rule, loaded_cost, item_id, trandate,
						pricing_basis_json, amount);

				if (!isEmpty(calc_details.alt_pricing.price)) {
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'rate',
						value : parseFloat(calc_details.alt_pricing.price),
						line : line
					});
				}
				if (!isEmpty(loaded_cost)) {
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'costestimaterate',
						value : parseFloat(loaded_cost),
						line : line
					});
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_nts_lc_costestimaterate',
						value : parseFloat(loaded_cost),
						line : line
					});
				}

				handle_alt_promotion(calc_details, line, sales_order);

			}

			function handle_alt_promotion(calc_details, line, sales_order,
					pricing_basis_json) {
				var promocode = calc_details.promocode;

				if (!isEmpty(promocode)) {
					var quantity = parseInt(calc_details.promoquantity)
							+ parseInt(pricing_basis_json.quantity);
					sales_order.setSublistValue({
						sublistId : 'item',
						fieldId : 'quantity',
						value : quantity,
						line : line
					});
				}

				sales_order.setSublistValue({
					sublistId : 'item',
					fieldId : 'custcol_nts_so_promo_code',
					value : promocode,
					line : line
				});

				sales_order.setSublistValue({
					sublistId : 'item',
					fieldId : 'price',
					value : BASE_PRICE_LEVEL,
					line : line
				});

				// sales_order.setSublistValue({
				// sublistId : 'item',
				// fieldId : 'custcol_nts_price_rule',
				// value : price_rule.id,
				// line : line
				// });
			}

			function apply_loaded_costing(scriptContext, line) {
				var objSalesOrder = scriptContext.newRecord;

				var customer = objSalesOrder.getValue({
					fieldId : 'entity'
				});

				var objLoadedCost;
				var itemId;
				var loaded_cost = null;

				itemId = objSalesOrder.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : line
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

			function sales_order_line_search(sales_order_id) {
				var search_obj = search.create({
					type : "transaction",
					filters : [ [ "internalid", "anyof", sales_order_id ],
							"AND", [ "mainline", "is", "F" ], "AND",
							[ "item.internalid", "noneof", "-8" ], "AND",
							[ "item.type", "anyof", "InvtPart", "Assembly" ] ],
					columns : [ search.createColumn({
						name : "entity",
						label : "Name"
					}), search.createColumn({
						name : "amount",
						label : "Amount"
					}), search.createColumn({
						name : "quantity",
						label : "Quantity"
					}), search.createColumn({
						name : "item",
						label : "Item"
					}), search.createColumn({
						name : "unit",
						label : "Units"
					}), search.createColumn({
						name : "unitid",
						label : "Unit Id"
					}), search.createColumn({
						name : "unitstype",
						join : "item",
						label : "Units Type"
					}) ]
				});

				return results(search_obj);
			}

			function sales_order_min_value_search(sales_order_id, item_filter) {
				var search_obj = search.create({
					type : "salesorder",
					filters : [ [ "type", "anyof", "SalesOrd" ], "AND",
							[ "internalid", "anyof", sales_order_id ], "AND",
							[ "mainline", "is", "F" ], "AND", item_filter ],
					columns : [ search.createColumn({
						name : "quantity",
						summary : "SUM",
						label : "Quantity"
					}), search.createColumn({
						name : "unitstype",
						join : "item",
						summary : "GROUP",
						label : "Units Type"
					}) ]
				});
				return results(search_obj);
			}

			function min_basis_search(filters) {

				var search_obj = search.create({
					type : "customrecord_nts_pr_min_basis",
					filters : filters,
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

			function alt_min_basis_search(filters) {

				var search_obj = search.create({
					type : "customrecord_nts_alt_pr_min_basis",
					filters : filters,
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_uom",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_threshold",
						label : "Minimum Value"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_item",
						label : "Min-Basis Item"
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
				beforeSubmit : null,
				afterSubmit : afterSubmit
			};

		});
