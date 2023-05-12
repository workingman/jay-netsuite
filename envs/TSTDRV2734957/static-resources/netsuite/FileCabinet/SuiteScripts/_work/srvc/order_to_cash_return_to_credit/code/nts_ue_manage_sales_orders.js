/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			function beforeLoad(scriptContext) {

			}

			function beforeSubmit(scriptContext) {
				try {
					if (scriptContext.type != scriptContext.UserEventType.DELETE) {
						apply_loaded_costing(scriptContext);
					}
				} catch (e) {
					log.error(e.name, e.stack);
				}
			}

			/**
			 * This process is used to apply internal sales rep and external
			 * sales rep costs to sales order line items 5.1.1.5.2 Main: The
			 * process starts when the user saves a sales order
			 * 
			 * For each line item, the system performs the following: Queries
			 * the loaded cost records using the following criteria: Line item�s
			 * Item, Sales order�s sales rep, Sales order�s partner If a loaded
			 * cost record is returned, the system performs the following: Sets
			 * the line item�s internal loaded cost to the loaded cost records
			 * internal cost, Sets the line item�s external loaded cost to the
			 * loaded cost records external cost The process ends
			 */
			function apply_loaded_costing(scriptContext) {
				var objSalesOrder = scriptContext.newRecord;

				var salesRep = objSalesOrder.getValue({
					fieldId : 'salesrep'
				});
				var partner = objSalesOrder.getValue({
					fieldId : 'partner'
				});
				var customform = objSalesOrder.getValue({
					fieldId : 'customform'
				});

				var objLoadedCost;

				if ((!isEmpty(salesRep)) && (!isEmpty(partner))) {

					for (var i = 0; i < objSalesOrder.getLineCount({
						sublistId : 'item'
					}); i++) {
						var itemId = objSalesOrder.getSublistValue({
							sublistId : 'item',
							fieldId : 'item',
							line : i
						});

						objLoadedCost = find_loaded_cost(itemId, salesRep,
								partner);

						if (!isEmpty(objLoadedCost)) {
							calculate_loaded_cost(objSalesOrder, objLoadedCost,
									i);
						}
					}
				}
			}

			function handle_internal_sales_rep() {
			}

			function handle_external_sales_rep() {
			}

			function calculate_loaded_cost(objSalesOrder, objLoadedCost, line) {
				objSalesOrder
						.setSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_nts_internal_loaded_cost',
							line : line,
							value : objLoadedCost.values.custrecord_nts_loaded_cost_internal_cost
						});
				objSalesOrder
						.setSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_nts_external_loaded_cost',
							line : line,
							value : objLoadedCost.values.custrecord_nts_loaded_cost_external_cost
						});
			}

			function find_loaded_cost(itemId, salesRep, partner) {
				var objLoadedCost = null;
				var results_array = [];
				var customrecord_nts_lc_itemSearchObj = search
						.create({
							type : "customrecord_nts_lc_item",
							filters : [
									[ "custrecord_nts_loaded_cost_item",
											"anyof", itemId ],
									"AND",
									[ "custrecord_nts_internal_sales_rep",
											"anyof", salesRep ],
									"OR",
									[ "custrecord_external_sales_rep", "anyof",
											partner ] ],
							columns : [
									search.createColumn({
										name : "name",
										sort : search.Sort.ASC,
										label : "Name"
									}),
									search.createColumn({
										name : "scriptid",
										label : "Script ID"
									}),
									search
											.createColumn({
												name : "custrecord_nts_internal_sales_rep",
												label : "internal_sales_rep"
											}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_internal_cost",
												label : "Internal Cost"
											}),
									search.createColumn({
										name : "custrecord_external_sales_rep",
										label : "external_sales_rep"
									}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_external_cost",
												label : "External Cost"
											}) ]
						});

				results_array = results(customrecord_nts_lc_itemSearchObj);
				if (results_array.length > 0) {
					objLoadedCost = JSON
							.parse(JSON.stringify(results_array[0]));
				}
				return objLoadedCost;
			}

			function find_loaded_cost_grouped(itemId, salesRep,
					internal_sales_rep_group, partner,
					external_sales_rep_group, item_group) {
				var objLoadedCost = null;
				var results_array = [];
				var customrecord_nts_lc_itemSearchObj = search
						.create({
							type : "customrecord_nts_lc_item",
							filters : [
									[ "custrecord_nts_loaded_cost_item",
											"anyof", itemId ],
									"AND",
									[ "custrecord_nts_internal_sales_rep",
											"anyof", salesRep ],
									"AND",
									[ "custrecord_external_sales_rep", "anyof",
											partner ] ],
							columns : [
									search.createColumn({
										name : "name",
										sort : search.Sort.ASC,
										label : "Name"
									}),
									search.createColumn({
										name : "scriptid",
										label : "Script ID"
									}),
									search
											.createColumn({
												name : "custrecord_nts_internal_sales_rep",
												label : "internal_sales_rep"
											}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_internal_cost",
												label : "Internal Cost"
											}),
									search.createColumn({
										name : "custrecord_external_sales_rep",
										label : "external_sales_rep"
									}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_external_cost",
												label : "External Cost"
											}) ]
						});

				results_array = results(customrecord_nts_lc_itemSearchObj);
				if (results_array.length > 0) {
					objLoadedCost = JSON
							.parse(JSON.stringify(results_array[0]));
				}
				return objLoadedCost;
			}

			/**
			 * 
			 * 
			 */
			function item_costing(scriptContext) {
				if (scriptContext.sublistId == 'item') {
					var objRecord = scriptContext.currentRecord;

					var intCustomerId = objRecord.getValue('entity');
					var stDate = objRecord.getText('trandate');
					var objCategoryLookup = search.lookupFields({
						type : search.Type.EMPLOYEE,
						id : intCustomerId,
						columns : [ 'category' ]
					});

					var intCustomerCategory = '';
					if (!isEmpty(objCategoryLookup.category)) {
						intCustomerCategory = objCategoryLookup.category[0].value;
					}

					var intItemId = objRecord.getCurrentSublistValue({
						sublistId : 'item',
						fieldId : 'item'
					});

					var objItemLookup = search.lookupFields({
						type : search.Type.ITEM,
						id : intItemId,
						columns : [ 'custitem_item_category' ]
					});

					if (!isEmpty(objItemLookup.custitem_item_category)) {
						var intItemCategory = objItemLookup['custitem_item_category'][0].value;
					}

					var objPriceResult = nts_md_manage_price_rule
							.get_price_rule(intCustomerId, stDate, intItemId,
									intCustomerCategory, intItemCategory,
									CONTRACT, CONTRACT, BEST_PRICE,
									PR_RECORD_ID);

					if (isEmpty(objPriceResult)) {
						objPriceResult = nts_md_manage_price_rule
								.get_price_rule(intCustomerId, stDate,
										intItemId, intCustomerCategory,
										intItemCategory, BEST_PRICE, CONTRACT,
										BEST_PRICE, PR_RECORD_ID);
					}

					if (!isEmpty(objPriceResult)) {
						objRecord.setCurrentSublistValue({
							sublistId : 'item',
							fieldId : 'price',
							value : BASE_PRICE_LEVEL
						});
						objRecord.setCurrentSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_nts_price_rule',
							value : objPriceResult.id
						});

						var flRate = '';
						if (objPriceResult.calcmethod == CALC_METHOD.fixed_price) {
							flRate = nts_md_manage_price_rule
									.fixed_price(objPriceResult);
						}
						if (objPriceResult.calcmethod == CALC_METHOD.cost_plus) {
							flRate = nts_md_manage_price_rule.cost_plus(
									objPriceResult, intItemId);
						}
						if (objPriceResult.calcmethod == CALC_METHOD.margin_plus) {
							flRate = nts_md_manage_price_rule.margin_plus(
									objPriceResult, intItemId);
						}
						if (objPriceResult.calcmethod == CALC_METHOD.list_less) {
							flRate = parseFloat(nts_md_manage_price_rule
									.list_less(objPriceResult, intItemId));
							if (flRate < 0) {
								dialog.alert({
									title : 'Warning',
									message : WARNING_MESSAGE.calculation
											+ '. Price Rule'
											+ objPriceResult.name
											+ '".\n Click OK to continue.'
								});
								return false;
							}
						}
						if (objPriceResult.calcmethod == CALC_METHOD.tiered_qty) {
							var intQuantity = objRecord
									.getCurrentSublistValue({
										sublistId : 'item',
										fieldId : 'quantity'
									});
							var objTieredDetails = nts_md_manage_price_rule
									.tiered_quantity(objPriceResult,
											intQuantity);
							if (isEmpty(objTieredDetails)
									|| (JSON.stringify(objTieredDetails) === '{}')) {
								dialog.alert({
									title : 'Warning',
									message : WARNING_MESSAGE.tieredqty
											+ ' on Price Rule'
											+ objPriceResult.name
											+ '".\n Click OK to continue.'
								});
								return false;
							}
							flRate = objTieredDetails.price;
						}

						objRecord.setCurrentSublistValue({
							sublistId : 'item',
							fieldId : 'rate',
							value : parseFloat(flRate),
						});
					}
				}
				return true;
			}

			function loaded_cost_search() {
				var customrecord_nts_lc_itemSearchObj = search
						.create({
							type : "customrecord_nts_lc_item",
							filters : [
									[ "isinactive", "is", "F" ],
									"AND",
									[
											[
													[
															"custrecord_nts_internal_sales_rep",
															"anyof", "2640" ],
													"OR",
													[
															"custrecord_nts_internal_sales_rep_group",
															"anyof", "1" ] ],
											"OR",
											[
													[
															"custrecord_external_sales_rep",
															"anyof", "2639" ],
													"OR",
													[
															"custrecord_nts_external_sales_rep_group",
															"anyof", "1" ] ] ] ],
							columns : [
									search.createColumn({
										name : "name",
										sort : search.Sort.ASC,
										label : "Name"
									}),
									search.createColumn({
										name : "scriptid",
										label : "Script ID"
									}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_type",
												label : "Loaded Cost Type"
											}),
									search
											.createColumn({
												name : "custrecord_nts_internal_sales_rep",
												label : "Internal Sales Rep"
											}),
									search
											.createColumn({
												name : "custrecord_nts_internal_sales_rep_group",
												label : "Internal Sales Rep Group"
											}),
									search.createColumn({
										name : "custrecord_external_sales_rep",
										label : "External Sales Rep"
									}),
									search
											.createColumn({
												name : "custrecord_nts_external_sales_rep_group",
												label : "External Sales Rep Group"
											}),
									search
											.createColumn({
												name : "custrecord_nts_external_cost_pct",
												label : "Loaded Cost %"
											}),
									search
											.createColumn({
												name : "custrecord_nts_lexternal_cost_amt",
												label : "Loaded Cost $"
											}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_item",
												label : "Item"
											}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_item_group",
												label : "Item Group"
											}),
									search
											.createColumn({
												name : "custrecord_nts_loaded_cost_calc_method",
												label : "Calculation Method"
											}) ]
						});
				var searchResultCount = customrecord_nts_lc_itemSearchObj
						.runPaged().count;
				log.debug("customrecord_nts_lc_itemSearchObj result count",
						searchResultCount);
				customrecord_nts_lc_itemSearchObj.run().each(function(result) {
					// .run().each has a limit of 4,000 results
					return true;
				});
			}

			function afterSubmit(scriptContext) {

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
				afterSubmit : null
			};

		});
