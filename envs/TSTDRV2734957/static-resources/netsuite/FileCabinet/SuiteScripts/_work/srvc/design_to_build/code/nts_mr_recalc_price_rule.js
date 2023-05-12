/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/error', 'N/record', 'N/runtime', 'N/search',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule' ],

		function(error, record, runtime, search, nts_md_manage_price_rule) {

			var price_rule_recalc_id = runtime.getCurrentScript().getParameter(
					{
						name : 'custscript_nts_price_rule_recalc'
					})

			var limit = 50;
			var limit_counter = 0;
			var limit_key = 1;

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

			function getInputData() {
				try {
					var customer;
					var item;
					var customer_method = runtime.getCurrentScript()
							.getParameter({
								name : 'custscript_nts_recalc_customer_method'
							})
					var customer_input = runtime.getCurrentScript()
							.getParameter({
								name : 'custscript_nts_recalc_customer_input'
							})
					var item_method = runtime.getCurrentScript().getParameter({
						name : 'custscript_nts_recalc_item_method'
					})
					var item_input = runtime.getCurrentScript().getParameter({
						name : 'custscript_nts_recalc_item_input'
					})

					var input_data = [];
					var customer_data;
					var item_data;

					switch (customer_method) {
					case 'customer':
						customer_data = handle_customer(customer_input);
						break;
					case 'affiliation':
						customer_data = handle_affiliation(customer_input);
						break;
					case 'customer_search':
						customer_data = handle_customer_search(customer_input);
						break;
					default:
						customer_data = [];
					}

					switch (item_method) {
					case 'item':
						item_data = handle_item(item_input);
						break;
					case 'item_group':
						item_data = handle_item_group(item_input);
						break;
					case 'item_search':
						item_data = handle_item_search(item_input);
						break;
					default:
						item_data = [];
					}

					for (var i = 0; i < customer_data.length; i++) {
						customer = customer_data[i];
						for (var j = 0; j < item_data.length; j++) {
							item = item_data[j];
							input_data.push({
								customer : customer,
								item : item
							});
						}
					}

					return input_data;
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function map(context) {
				try {
					var input_data = JSON.parse(context.value);
					var customer = input_data.customer;
					var item = input_data.item;

					limit_counter = limit_counter + 1;

					if (limit_counter == limit) {
						limit_key = limit_key + 1;
						limit_counter = 0;
					}

					context.write({
						key : {
							limit_key : limit_key,
							customer : customer
						},
						value : {
							item : item
						}
					});
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function reduce(context) {
				try {
					var customer = JSON.parse(context.key).customer;
					var values = context.values;
					var item;
					var price_rule_recalc_result = price_rule_recalc_search(price_rule_recalc_id);
					var price_rule_id;

					if (!isEmpty(price_rule_recalc_result)) {
						for (var i = 0; i < values.length; i++) {
							item = JSON.parse(values[i]).item
							price_rule_id = price_rule_search(customer.id,
									item.id);
							if (!isEmpty(price_rule_id)) {
								recalc_price_rule(price_rule_id);
							}
						}
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function summarize(summary) {
				try {
					log.audit('summarize', JSON.stringify(summary));
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function handle_customer(customer_input) {
				return [ {
					id : customer_input
				} ];
			}

			function handle_affiliation(customer_input) {
				return customer_affiliation_search(customer_input);
			}

			function handle_customer_search(customer_input) {
				return results(search.load({
					id : customer_input
				}));
			}

			function handle_item(item_input) {
				return [ {
					id : item_input
				} ];
			}

			function handle_item_group(item_input) {
				return item_group_search(item_input);
			}

			function handle_item_search(item_input) {
				return results(search.load({
					id : item_input
				}));
			}

			function recalc_price_rule(price_rule_id) {
				var price_rule = record.load({
					type : 'customrecord_nts_price_rule',
					id : price_rule_id,
					isDynamic : false
				});

				price_rule.save();
			}

			function price_rule_search(customer_id, item_id) {
				var price_rule_results;
				var price_rule_result_id;
				var search_obj = search.create({
					type : "customrecord_nts_price_rule",
					filters : [
							[ "custrecord_nts_pr_customer", "anyof",
									customer_id ], "AND",
							[ "custrecord_nts_pr_item", "anyof", item_id ],
							"AND", [ "isinactive", "is", "F" ] ],
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
						name : "custrecord_nts_pr_customer",
						label : "Customer"
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
						name : "custrecord_nts_pr_markup_percent",
						label : "Markup %"
					}), search.createColumn({
						name : "custrecord_nts_pr_markup_amount",
						label : "Markup Amount"
					}), search.createColumn({
						name : "custrecord_nts_pr_discount_amount",
						label : "Discount Amount"
					}), search.createColumn({
						name : "custrecord_nts_pr_discount_percent",
						label : "Discount %"
					}), search.createColumn({
						name : "custrecord_nts_pr_fixed_price",
						label : "Fixed Price"
					}), search.createColumn({
						name : "custrecord_nts_pr_margin_percent",
						label : "Margin %"
					}), search.createColumn({
						name : "custrecord_nts_pr_rate",
						label : "Rate"
					}) ]
				});

				price_rule_results = results(search_obj);

				if (price_rule_results.length > 0) {
					price_rule_result_id = price_rule_results[0].id;
				}

				return price_rule_result_id;
			}

			function price_rule_recalc_search(price_rule_recalc_id) {
				var price_rule_recalc_results;
				var price_rule_recalc_result;
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_recalc",
					filters : [ [ "internalidnumber", "equalto",
							price_rule_recalc_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_recalc_customer",
						label : "Customer"
					}), search.createColumn({
						name : "custrecord_nts_pr_recalc_affiliation",
						label : "Affiliation"
					}), search.createColumn({
						name : "custrecord_nts_pr_recalc_customer_search",
						label : "Customer Search"
					}), search.createColumn({
						name : "custrecord_nts_pr_recalc_item",
						label : "Item"
					}), search.createColumn({
						name : "custrecord_nts_pr_recalc_item_group",
						label : "Item Group"
					}), search.createColumn({
						name : "custrecord_nts_pr_recalc_item_search",
						label : "Item Search"
					}), search.createColumn({
						name : "custrecord_nts_price_rule_recalc_app",
						label : "Appication"
					}) ]
				});

				price_rule_recalc_results = results(search_obj);

				if (price_rule_recalc_results.length > 0) {
					price_rule_recalc_result = price_rule_recalc_results[0];
				}

				return price_rule_recalc_result;
			}

			function customer_affiliation_search(affiliation_id) {
				var search_obj = search.create({
					type : "customer",
					filters : [
							[ "custentity_nts_lc_customer_group", "anyof",
									affiliation_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "entityid",
						sort : search.Sort.ASC,
						label : "ID"
					}), search.createColumn({
						name : "altname",
						label : "Name"
					}), search.createColumn({
						name : "email",
						label : "Email"
					}), search.createColumn({
						name : "phone",
						label : "Phone"
					}), search.createColumn({
						name : "altphone",
						label : "Office Phone"
					}), search.createColumn({
						name : "fax",
						label : "Fax"
					}), search.createColumn({
						name : "contact",
						label : "Primary Contact"
					}), search.createColumn({
						name : "altemail",
						label : "Alt. Email"
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
				getInputData : getInputData,
				map : map,
				reduce : reduce,
				summarize : summarize
			};

		});
