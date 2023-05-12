/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			function pageInit(scriptContext) {

			}

			function fieldChanged(scriptContext) {

			}

			function postSourcing(scriptContext) {

			}

			function sublistChanged(scriptContext) {

			}

			function lineInit(scriptContext) {

			}

			function validateField(scriptContext) {

			}

			function validateLine(scriptContext) {

			}

			function validateInsert(scriptContext) {

			}

			function validateDelete(scriptContext) {

			}

			function saveRecord(scriptContext) {
				try {
					var price_rule = scriptContext.currentRecord;

					if (isEmpty(price_rule.id)) {

						var customer_id = price_rule.getValue({
							fieldId : 'custrecord_nts_pr_customer'
						});
						var item_id = price_rule.getValue({
							fieldId : 'custrecord_nts_pr_item'
						});

						var price_rule_results = check_duplicate_price_rule(
								customer_id, item_id);

						if (price_rule_results.length > 0) {
							alert('A price rule for this customer and item already exists; duplicates price rules are not allowed.');
							return false;
						}
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
					return false;
				}
				return true;
			}

			function check_duplicate_price_rule(customer_id, item_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule",
					filters : [
							[ "custrecord_nts_pr_customer", "anyof",
									customer_id ], "AND",
							[ "custrecord_nts_pr_item", "anyof", item_id ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_start_date",
						label : "Start Date"
					}), search.createColumn({
						name : "custrecord_nts_pr_end_date",
						label : "End Date"
					}), search.createColumn({
						name : "custrecord_nts_pr_type",
						label : "Type"
					}), search.createColumn({
						name : "custrecord_nts_pr_item",
						label : "Item"
					}), search.createColumn({
						name : "custrecord_nts_pr_calculation_method",
						label : "Calculation Method"
					}), search.createColumn({
						name : "custrecord_nts_pr_calculation_basis",
						label : "Calculation Basis"
					}), search.createColumn({
						name : "custrecord_nts_pr_customer",
						label : "Customer"
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
				pageInit : null,
				fieldChanged : null,
				postSourcing : null,
				sublistChanged : null,
				lineInit : null,
				validateField : null,
				validateLine : null,
				validateInsert : null,
				validateDelete : null,
				saveRecord : saveRecord
			};

		});
