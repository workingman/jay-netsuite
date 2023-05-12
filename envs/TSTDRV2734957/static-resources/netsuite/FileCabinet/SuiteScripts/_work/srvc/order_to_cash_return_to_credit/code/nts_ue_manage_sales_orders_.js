/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			var fixed_cost = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_lc_fixed_cost'
			});

			function beforeLoad(scriptContext) {

			}

			function beforeSubmit(scriptContext) {
				try {
					if (scriptContext.type != scriptContext.UserEventType.DELETE) {
						apply_loaded_costing(scriptContext);
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
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

				var objLoadedCost;
				var itemId;

				if (!isEmpty(salesRep)) {
					for (var i = 0; i < objSalesOrder.getLineCount({
						sublistId : 'item'
					}); i++) {

						itemId = objSalesOrder.getSublistValue({
							sublistId : 'item',
							fieldId : 'item',
							line : i
						});

						objLoadedCost = find_loaded_cost(itemId, salesRep);

						if (!isEmpty(objLoadedCost)) {
							calculate_loaded_cost(objSalesOrder, objLoadedCost,
									i);
						}
					}
				}
			}

			function find_loaded_cost(itemId, salesRep) {
				var objLoadedCost = null;
				var results_array = [];
				var loaded_cost_filters;
				var item_search;
				var item_filter;
				var item_results;

				var lookupFields = search.lookupFields({
					type : search.Type.EMPLOYEE,
					id : salesRep,
					columns : [ 'custentity_nts_sales_rep_group' ]
				});

				var sales_rep_group = lookupFields.custentity_nts_sales_rep_group;

				if (isEmpty(sales_rep_group) || sales_rep_group.length == 0) {
					loaded_cost_filters = [
							[ "isinactive", "is", "F" ],
							"AND",
							[ "custrecord_nts_lc_sales_rep", "anyof", salesRep ] ]
				} else {
					loaded_cost_filters = [
							[ "isinactive", "is", "F" ],
							"AND",
							[
									[ "custrecord_nts_lc_sales_rep", "anyof",
											salesRep ],
									"OR",
									[ "custrecord_nts_lc_sales_rep_group",
											"anyof", sales_rep_group[0].value ] ] ]
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

				return objLoadedCost;
			}

			function calculate_loaded_cost(objSalesOrder, objLoadedCost, line) {
				var loaded_cost;
				var calc_method = objLoadedCost
						.getValue('custrecord_nts_lc_calc_method');

				if (calc_method == fixed_cost) {
					loaded_cost = objLoadedCost
							.getValue('custrecord_nts_lc_cost_amt');
				}

				objSalesOrder.setSublistValue({
					sublistId : 'item',
					fieldId : 'custcol_nts_loaded_cost',
					line : line,
					value : loaded_cost
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
