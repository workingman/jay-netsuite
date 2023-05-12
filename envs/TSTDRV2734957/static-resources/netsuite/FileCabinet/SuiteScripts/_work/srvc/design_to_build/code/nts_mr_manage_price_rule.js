/**
 * Copyright (c) 1998-2017 NetSuite, Inc. 
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511 
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[
				'N/record',
				'N/runtime',
				'N/search',
				'N/format',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule',
				'N/config', 'N/util' ],

		/**
		 * This process is used to review active Price Rules, based on their
		 * start and end dates and update customer records adding new price rule
		 * items to the customer*s item pricing list and removing expired price
		 * rule items from the customer*s item pricing list; in the case when a
		 * price rule*s item is added to the customer*s item pricing list the
		 * pricing item price is calculated
		 * 
		 * The process starts on a scheduled basis daily or more frequently if
		 * needed
		 * 
		 * The system performs the following: Queries price rule records using
		 * the following criteria: Start date = current date OR End date =
		 * current date
		 * 
		 * For each price rule record, the system performs the following: Checks
		 * if the price rule specifies a customer If so, the system performs the
		 * following: Queries customer records using the following: Price rule
		 * record*s customer Otherwise, the system performs the following:
		 * Queries customer records using the following: Price rule record*s
		 * customer group For each customer, the system performs the following:
		 * Checks if the price rule record is expired If so, the system performs
		 * the following: For each item in the customer*s item pricing list, the
		 * system performs the following: Checks if the item matches the item on
		 * the price rule record If so, the system performs the following:
		 * Checks if price level = *Custom* If so, the system performs the
		 * following: Removes the item from the customer*s item pricing list
		 * Otherwise, the system performs the following: For each item in the
		 * customer*s item pricing list, the system performs the following:
		 * Checks if the item matches the item on the price rule record If so,
		 * the system performs the following: Checks if price level = *Custom*
		 * If so, the system performs the following: Sets the pricing item price
		 * to the value returned from one of the following calculation methods
		 * specified on the price rule record: Fixed Price, Cost Plus, Margin
		 * Plus, List Less. Otherwise, the system performs the following: Checks
		 * if price level = *Custom* If so, the system performs the following:
		 * Adds the price rule record*s item to the customer*s item pricing list
		 * Sets the pricing item price to the value returned from one of the
		 * following calculation methods specified on the price rule record:
		 * Fixed Price, Cost Plus, Margin Plus, List Less
		 * 
		 * Saves the customer record
		 * 
		 * The process ends
		 */

		function(record, runtime, search, format, nts_md_manage_price_rule,
				config, util) {

			var scriptObj = runtime.getCurrentScript();
			var customPriceLevel = scriptObj.getParameter({
				name : 'custscript_nts_custom_price_level'
			});
			var priceRuleSearchId = scriptObj.getParameter({
				name : 'custscript_nts_price_rule_input_search'
			});
			var BATCH_PR_PREF = 2;

			var customerArray = [];
			var inputDataArray = [];
			var customerInputDataArray = [];

			var CALC_METHOD_LC = {
				fixed_cost : 1,
				average_cost : 2
			};

			function getInputData() {
				var priceRuleResults;
				var priceRule;
				var customer;
				try {
					priceRuleResults = searchResults(priceRuleSearchId);

					for (var i = 0; i < priceRuleResults.length; i++) {
						priceRule = JSON.parse(JSON
								.stringify(priceRuleResults[i])).values;
						if (priceRule.custrecord_nts_pr_customer.length > 0) {
							customer = priceRule.custrecord_nts_pr_customer[0].value;
							if (customerArray.indexOf(customer) == -1) {
								customerArray.push(customer);
							}
						}
						if (priceRule.custrecord_nts_pr_group.length > 0) {
							customerGroup = priceRule.custrecord_nts_pr_group[0].value;
							customerResultsObj = customerResults(customer,
									customerGroup);
							for (var j = 0; j < customerResultsObj.length; j++) {
								if (customerArray
										.indexOf(customerResultsObj[j].id) == -1) {
									customerArray
											.push(customerResultsObj[j].id);
								}
							}
						}
					}

					return customerArray;

				} catch (e) {
					log.error(e, e.message);
				}
			}

			function map(context) {
				try {
					var priceRuleArray_expired = [];
					var priceRuleArray_active = [];
					var priceRuleItemArray_expired = [];
					var priceRuleItemArray_active = [];
					var priceRuleKey;
					var priceRuleKeyArray_expired = [];
					var priceRuleKeyArray_active = [];
					var item;
					var itemGroup;
					var itemRslt;
					var itemArray = [];
					var priceRuleArray;
					var priceRuleItemArray;
					var priceRuleRslt;

					var customerId = context.value;
					var fieldLookUp = search.lookupFields({
						type : record.Type.CUSTOMER,
						id : customerId,
						columns : [ 'category' ]
					});

					var customerGroup;

					if (fieldLookUp.category.length > 0) {
						customerGroup = fieldLookUp.category[0].value;
					}

					if (isEmpty(customerGroup)) {
						priceRuleRslt = priceRuleResults(customerId, '');
					} else {
						priceRuleRslt = priceRuleResults(customerId,
								customerGroup);
					}

					for (var i = 0; i < priceRuleRslt.length; i++) {
						priceRule = JSON
								.parse(JSON.stringify(priceRuleRslt[i])).values;

						itemArray = [];

						if (priceRule.custrecord_nts_pr_item.length > 0) {
							item = priceRule.custrecord_nts_pr_item[0].value;
							if (itemArray.indexOf(item) == -1) {
								itemArray.push(item);
							}
						}
						if (priceRule.custrecord_nts_pr_item_group.length > 0) {
							itemGroup = priceRule.custrecord_nts_pr_item_group[0].value;
							itemRslt = itemResults(item, itemGroup);
							for (var j = 0; j < itemRslt.length; j++) {
								if (itemArray.indexOf(itemRslt[j].id) == -1) {
									itemArray.push(itemRslt[j].id);
								}
							}
						}

						for (var k = 0; k < itemArray.length; k++) {
							priceRuleKey = customerId + itemArray[k];

							if (isExpired(priceRule.custrecord_nts_pr_end_date)) {
								if (priceRuleKeyArray_expired
										.indexOf(priceRuleKey) == -1) {
									priceRuleKeyArray_expired
											.push(priceRuleKey);
									priceRuleArray_expired.push(priceRule);
									priceRuleItemArray_expired
											.push(itemArray[k]);
								}
							} else {
								if (priceRuleKeyArray_active
										.indexOf(priceRuleKey) == -1) {
									priceRuleKeyArray_active.push(priceRuleKey);
									priceRuleArray_active.push(priceRule);
									priceRuleItemArray_active
											.push(itemArray[k]);
								}
							}
						}
					}

					priceRuleArray = priceRuleArray_expired
							.concat(priceRuleArray_active);
					priceRuleItemArray = priceRuleItemArray_expired
							.concat(priceRuleItemArray_active);

					context.write({
						key : {
							customerId : customerId
						},
						value : {
							priceRuleArray : priceRuleArray,
							priceRuleItemArray : priceRuleItemArray
						}
					});

				} catch (e) {
					log.error('Map - Error Found', e);
					throw e;
				}
			}

			function reduce(context) {
				try {
					var priceRule;
					var itemId;
					var customerId;
					var priceRuleArray;
					var priceRuleItemArray

					customerId = JSON.parse(context.key).customerId;

					var recCustomer = record.load({
						type : record.Type.CUSTOMER,
						id : customerId
					});

					for (var i = 0; i < context.values.length; i++) {
						priceRuleArray = JSON.parse(context.values[i]).priceRuleArray;
						priceRuleItemArray = JSON.parse(context.values[i]).priceRuleItemArray;

						for (var k = 0; k < priceRuleArray.length; k++) {
							priceRule = priceRuleArray[k];
							itemId = priceRuleItemArray[k];
							if (isExpired(priceRule.custrecord_nts_pr_end_date)) {
								removeItemFromPricingList(itemId, recCustomer,
										customPriceLevel);
							} else {
								upsertItemToPricingList(itemId, recCustomer,
										customPriceLevel, determineUnitPrice(
												priceRule, itemId, customerId));
							}
						}
					}

					recCustomer.save();

				} catch (e) {
					log.error('Reduce - Error Found', e);
					throw e;
				}
			}

			function summarize(summary) {
				summary.mapSummary.errors.iterator().each(function(key, error) {
					log.error('Map error for key: ' + key, error);
					return true;
				});

				if (summary.isRestarted) {
					log.audit('SUMMARY isRestarted', 'YES');
				} else {
					log.audit('SUMMARY isRestarted', 'NO');
				}
				log.audit('summarize', JSON.stringify(summary));
			}

			function priceRuleResults(customer, customerGroup) {
				var priceRuleSearchId = scriptObj.getParameter({
					name : 'custscript_nts_price_rule_input_search'
				});

				var priceRuleSearch

				if (!isEmpty(customerGroup)) {
					priceRuleSearch = search.create({
						type : 'customrecord_nts_price_rule',
						columns : [ {
							name : 'custrecord_nts_pr_priority',
							sort : search.Sort.ASC
						}, 'name', 'id', {
							name : 'lastmodified',
							sort : search.Sort.DSC
						}, 'custrecord_nts_pr_start_date', {
							name : 'custrecord_nts_pr_end_date',
							sort : search.Sort.ASC
						}, 'custrecord_nts_pr_type',
								'custrecord_nts_pr_customer',
								'custrecord_nts_pr_group',
								'custrecord_nts_pr_item',
								'custrecord_nts_pr_item_group',
								'custrecord_nts_pr_calculation_method',
								'custrecord_nts_pr_markup_percent',
								'custrecord_nts_pr_markup_amount',
								'custrecord_nts_pr_discount_amount',
								'custrecord_nts_pr_discount_percent',
								'custrecord_nts_pr_fixed_price' ],
						filters : [
								[
										[ 'custrecord_nts_pr_customer',
												'ANYOF', customer ],
										'OR',
										[ 'custrecord_nts_pr_group', 'ANYOF',
												customerGroup ] ],
								'AND',
								[ 'isinactive', 'IS', 'F' ],
								'AND',
								[ 'custrecord_nts_pr_calculation_method',
										'NONEOF', 5 ],
								'AND',
								[
										[ 'custrecord_nts_pr_start_date',
												'onorbefore', 'today' ],
										'OR',
										[ 'custrecord_nts_pr_end_date', 'ON',
												'today' ] ] ]
					});
				} else {
					priceRuleSearch = search.create({
						type : 'customrecord_nts_price_rule',
						columns : [ {
							name : 'custrecord_nts_pr_priority',
							sort : search.Sort.ASC
						}, 'name', 'id', {
							name : 'lastmodified',
							sort : search.Sort.DESC
						}, 'custrecord_nts_pr_start_date', {
							name : 'custrecord_nts_pr_end_date',
							sort : search.Sort.ASC
						}, 'custrecord_nts_pr_type',
								'custrecord_nts_pr_customer',
								'custrecord_nts_pr_group',
								'custrecord_nts_pr_item',
								'custrecord_nts_pr_item_group',
								'custrecord_nts_pr_calculation_method',
								'custrecord_nts_pr_markup_percent',
								'custrecord_nts_pr_markup_amount',
								'custrecord_nts_pr_discount_amount',
								'custrecord_nts_pr_discount_percent',
								'custrecord_nts_pr_fixed_price' ],
						filters : [
								[ [ 'custrecord_nts_pr_customer', 'ANYOF',
										customer ] ],
								'AND',
								[ 'isinactive', 'IS', 'F' ],
								'AND',
								[ 'custrecord_nts_pr_calculation_method',
										'NONEOF', 5 ],
								'AND',
								[
										[ 'custrecord_nts_pr_start_date',
												'onorbefore', 'today' ],
										'OR',
										[ 'custrecord_nts_pr_end_date', 'ON',
												'today' ] ] ]
					});
				}

				return results(priceRuleSearch);
			}

			function customerResults(customer, customerGroup) {

				var customerSearchId = scriptObj.getParameter({
					name : 'custscript_nts_customer_search'
				});

				var customerSearch = search.load({
					id : customerSearchId
				});

				var filters = customerSearch.filters;

				if (!isEmpty(customer)) {
					var custFilter = search.createFilter({
						name : 'internalid',
						operator : 'ANYOF',
						values : [ customer, customerGroup ]
					});
					filters.push(custFilter);
				} else {
					var custGroupFilter = search.createFilter({
						name : 'category',
						operator : 'ANYOF',
						values : [ customerGroup ]
					});
					filters.push(custGroupFilter);
				}
				return results(customerSearch);
			}

			function itemResults(item, itemGroup) {
				var itemSearchId = scriptObj.getParameter({
					name : 'custscript_nts_item_search'
				});

				var itemSearch = search.load({
					id : itemSearchId
				});

				var filters = itemSearch.filters;

				if (!isEmpty(item)) {
					var itemFilter = search.createFilter({
						name : 'internalid',
						operator : 'ANYOF',
						values : [ item, itemGroup ]
					});

					filters.push(itemFilter);
				} else {
					var itemGroupFilter = search.createFilter({
						name : 'custitem_item_category',
						operator : 'ANYOF',
						values : [ itemGroup ]
					});

					filters.push(itemGroupFilter);
				}

				return results(itemSearch);
			}

			function removeItemFromPricingList(itemId, recCustomer,
					customPriceLevel) {
				var arrInSublist = new Array;
				var intLineItems = recCustomer.getLineCount({
					sublistId : 'itempricing'
				});

				if (intLineItems > 0) {
					arrInSublist = existsInSublist(recCustomer, intLineItems,
							itemId, customPriceLevel);

					if (arrInSublist.length != 0) {
						for (var j = intLineItems - 1; j >= 0; j--) {
							var currentItem = recCustomer.getSublistValue({
								sublistId : 'itempricing',
								fieldId : 'item',
								line : j
							});
							var currentPriceLevel = recCustomer
									.getSublistValue({
										sublistId : 'itempricing',
										fieldId : 'level',
										line : j
									});

							if ((currentItem == itemId)
									&& (currentPriceLevel == customPriceLevel)) {
								log
										.debug('removeItem', 'cust: '
												+ recCustomer.id + ' - item: '
												+ itemId);
								recCustomer.removeLine({
									sublistId : 'itempricing',
									line : j,
									ignoreRecalc : true
								});
							}
						}
					}
				}
			}

			function upsertItemToPricingList(itemId, recCustomer,
					customPriceLevel, unitPrice) {
				var arrInSublist = new Array;

				var intLineItems = recCustomer.getLineCount({
					sublistId : 'itempricing'
				});

				if (intLineItems > 0) {
					arrInSublist = existsInSublist(recCustomer, intLineItems,
							itemId, customPriceLevel);

					if (arrInSublist.length == 0) {
						log.debug('addItem', 'cust: ' + recCustomer.id
								+ ' - item: ' + itemId);
						addItem(recCustomer, intLineItems, itemId, unitPrice,
								customPriceLevel);
					} else {
						log.debug('updateItem', 'cust: ' + recCustomer.id
								+ ' - item: ' + itemId);
						updateItem(recCustomer, arrInSublist, unitPrice);
					}
				} else {
					log.debug('addItem', 'cust: ' + recCustomer.id
							+ ' - item: ' + itemId);
					addItem(recCustomer, intLineItems, itemId, unitPrice,
							customPriceLevel);
				}
			}

			function isExpired(endDate) {
				var boolExpired = false;
				var todayDate = new Date();
				var d2 = endDate.split("/");
				var to = new Date(d2[2], d2[0] - 1, parseInt(d2[1]));
				var check = todayDate;

				check.setHours(0, 0, 0, 0);
				to.setHours(0, 0, 0, 0);

				if (check >= to) {
					boolExpired = true;
				}

				return boolExpired;
			}

			function existsInSublist(recCustomer, intLineItems, itemId,
					customPriceLevel) {
				var arrPosInSublist = new Array;
				var currentItem;
				var priceLevel;

				for (var j = 0; j < intLineItems; j++) {
					currentItem = recCustomer.getSublistValue({
						sublistId : 'itempricing',
						fieldId : 'item',
						line : j
					});
					priceLevel = recCustomer.getSublistValue({
						sublistId : 'itempricing',
						fieldId : 'level',
						line : j
					});

					if ((currentItem == itemId)
							&& (priceLevel == customPriceLevel)) {
						arrPosInSublist.push(j);
					}
				}

				return arrPosInSublist;
			}

			function determineUnitPrice(priceRule, itemId, customerId) {
				var CALC_METHOD = new Object;
				var flRate = 0;
				var calcMethod;
				var CALC_METHOD = createCalcMethodObj();

				var loaded_cost = apply_loaded_costing(customerId, itemId);

				calcMethod = priceRule.custrecord_nts_pr_calculation_method[0].value;

				if (calcMethod == CALC_METHOD.fixed_price) {
					flRate = nts_md_manage_price_rule.fixed_price(priceRule);
				} else if (calcMethod == CALC_METHOD.cost_plus) {
					flRate = nts_md_manage_price_rule.cost_plus(priceRule,
							itemId, loaded_cost);
				} else if (calcMethod == CALC_METHOD.margin_plus) {
					flRate = nts_md_manage_price_rule.margin_plus(priceRule,
							itemId, loaded_cost);
				} else if (calcMethod == CALC_METHOD.list_less) {
					flRate = nts_md_manage_price_rule.list_less(priceRule,
							itemId, loaded_cost);
				}

				return flRate;
			}

			function updateItem(recCustomer, arrPosInSublist, unitPrice) {
				for (var i = 0; i < arrPosInSublist.length; i++) {
					var itemPos = arrPosInSublist[i];
					var currentItem = recCustomer.setSublistValue({
						sublistId : 'itempricing',
						fieldId : 'price',
						line : itemPos,
						value : unitPrice
					});
				}
			}

			function addItem(recCustomer, intLineItems, itemId, unitPrice,
					customPriceLevel) {
				var linePos = intLineItems;

				recCustomer.setSublistValue({
					sublistId : 'itempricing',
					fieldId : 'item',
					line : linePos,
					value : itemId
				});

				recCustomer.setSublistValue({
					sublistId : 'itempricing',
					fieldId : 'level',
					line : linePos,
					value : customPriceLevel
				});

				recCustomer.setSublistValue({
					sublistId : 'itempricing',
					fieldId : 'price',
					line : linePos,
					value : unitPrice
				});

				recCustomer.setSublistValue({
					sublistId : 'itempricing',
					fieldId : 'currency',
					line : intLineItems,
					value : recCustomer.getValue('currency')
				});

			}

			function createCalcMethodObj() {
				var fixed_price_value = scriptObj.getParameter({
					name : 'custscript_nts_fixed_price'
				});
				var cost_plus_value = scriptObj.getParameter({
					name : 'custscript_nts_cost_plus'
				});
				var margin_plus_value = scriptObj.getParameter({
					name : 'custscript_nts_margin_plus'
				});
				var list_less_value = scriptObj.getParameter({
					name : 'custscript_nts_list_less'
				});

				var CALC_METHOD = {
					fixed_price : 1,
					markup : 2,
					margin_plus : 3,
					list_less : 4,
					tiered_qty : 5,
					promotion : 6
				};

				return CALC_METHOD;
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
									[
											[ "custrecord_nts_lc_customer",
													"anyof", customer ],
											"OR",
											[
													"custrecord_nts_lc_customer_group",
													"anyof",
													customer_group[0].value ] ] ]
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
									[ "custrecord_nts_lc_customer", "anyof",
											customer ],
									"AND",
									[
											[ "custrecord_nts_lc_customer",
													"anyof", customer ],
											"OR",
											[
													"custrecord_nts_lc_customer_group",
													"anyof",
													customer_group[0].value ] ] ]
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

				if (calc_method == CALC_METHOD_LC.fixed_cost) {
					loaded_cost = objLoadedCost
							.getValue('custrecord_nts_lc_cost_amt');
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

			function isBatch() {
				var objComapnyPref = config.load({
					type : config.Type.COMPANY_PREFERENCES
				});
				var prPreference = objComapnyPref
						.getValue('custscript_nts_pr_ui_processing_mode');
				if (prPreference == BATCH_PR_PREF) {
					return true;
				} else {
					return false;
				}
			}

			function searchResults(searchId) {
				var resultsArray = [];
				var searchObj = search.load({
					id : searchId
				});
				var page = searchObj.runPaged({
					pageSize : 1000
				});
				var pageRange;

				for (var i = 0; i < page.pageRanges.length; i++) {
					pageRange = page.fetch({
						index : page.pageRanges[i].index
					});
					resultsArray = resultsArray.concat(pageRange.data);
				}
				return resultsArray;
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
				getInputData : getInputData,
				map : map,
				reduce : reduce,
				summarize : summarize
			};
		});
