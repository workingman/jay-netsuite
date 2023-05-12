/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			var price_rule_create_id = runtime.getCurrentScript().getParameter(
					{
						name : 'custscript_nts_price_rule_delete_pr_crea'
					})

			var limit = 50;
			var limit_counter = 0;
			var limit_key = 1;

			function getInputData() {
				try {

					return [ price_rule_create_id ];

				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}

			}

			function map(context) {
				try {
					var input_data = JSON.parse(context.value);

					limit_counter = limit_counter + 1;

					if (limit_counter == limit) {
						limit_key = limit_key + 1;
						limit_counter = 0;
					}

					context.write({
						key : {
							limit_key : limit_key,
						},
						value : {
							input_data : input_data
						}
					});
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function reduce(context) {
				try {
					var values = context.values;

					for (var i = 0; i < values.length; i++) {

						delete_price_rule(JSON
								.parse(values[i]).input_data);
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

			function delete_price_rule(price_rule_id) {	
				
				alt_price_rule_delete(price_rule_id);
				price_rule_tier_delete(price_rule_id);
				price_rule_promo_delete(price_rule_id);
				price_rule_min_basis_delete(price_rule_id);
				
				record.delete({
					type : 'customrecord_nts_price_rule_create',
					id : price_rule_id,
				});
			}

			function duplicate_price_rule(customer_id, item_id) {
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

			function price_rule_tier_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_qty_tier",
					filters : [
							[ "custrecord_nts_prqt_price_rule", "anyof",
									price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "id",
						label : "ID"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_prqt_price_rule",
						label : "Price Rule"
					}), search.createColumn({
						name : "custrecord_nts_prqt_starting_quantity",
						label : "Starting Tier"
					}), search.createColumn({
						name : "custrecord_nts_prqt_qty_price",
						label : "Tier Price"
					}) ]
				});

				return results(search_obj);
			}
			
			function price_rule_promo_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_promo",
					filters : [ [ "custrecord_nts_pr_promo_price_rule",
							"anyof", price_rule_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "id",
						label : "ID"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_price_rule",
						label : "Price Rule"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_min_quantity",
						label : "Min Quantity"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_max_quantity",
						label : "Max Quantity"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_qty_price",
						label : "Quantity Price"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_code",
						label : "Promo Code"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_quantity",
						label : "Promo Quantity"
					}) ]
				});

				return results(search_obj);
			}

			function customer_affiliation_search(affiliation_id) {
				var search_obj = search
						.create({
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

			function item_group_search(item_group) {
				var search_obj = search.create({
					type : "item",
					filters : [ [ "custitem_nts_adv_pricing_item_cat", "anyof",
							item_group ] ],
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
					})]
				});

				return results(search_obj);
			}

			function price_rule_delete_search(price_rule_delete_id) {
				var price_rule_delete_results;
				var price_rule_delete_result;
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_delete",
					filters : [ [ "internalidnumber", "equalto", price_rule_delete_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_delete_customer",
						label : "Customer"
					}), search.createColumn({
						name : "custrecord_nts_pr_delete_affiliation",
						label : "Affiliation"
					}), search.createColumn({
						name : "custrecord_nts_pr_delete_customer_search",
						label : "Customer Search"
					}), search.createColumn({
						name : "custrecord_nts_pr_delete_item",
						label : "Item"
					}), search.createColumn({
						name : "custrecord_nts_pr_delete_item_group",
						label : "Item Group"
					}), search.createColumn({
						name : "custrecord_nts_pr_delete_item_search",
						label : "Item Search"
					}), search.createColumn({
						name : "custrecord_nts_price_rule_delete_app",
						label : "Appication"
					}) ]
				});

				price_rule_delete_results = results(search_obj);

				if (price_rule_delete_results.length > 0) {
					price_rule_delete_result = price_rule_delete_results[0];
				}

				return price_rule_delete_result;
			}

			function price_rule_tier_delete(price_rule_id) {
				var price_rule_tier_results = price_rule_tier_search(price_rule_id);
				var price_rule_tier_result;
				for (var i = 0; i < price_rule_tier_results.length; i++) {
					price_rule_tier_result = price_rule_tier_results[i];
					record.delete({
						type : 'customrecord_nts_price_rule_tier_create',
						id : price_rule_tier_result.id
					});
				}
			}

			function price_rule_tier_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_tier_create",
					filters : [
							[ "custrecord_nts_tier_create_price_rule", "anyof",
									price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}) ]
				});

				return results(search_obj);
			}

			function price_rule_promo_delete(price_rule_id) {
				var price_rule_promo_results = price_rule_promo_search(price_rule_id);
				var price_rule_promo_result;

				for (var i = 0; i < price_rule_promo_results.length; i++) {
					price_rule_promo_result = price_rule_promo_results[i];
					record.delete({
						type : 'customrecord_nts_price_rule_promo_create',
						id : price_rule_promo_result.id
					});
				}
			}

			function price_rule_promo_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_promo_create",
					filters : [ [ "custrecord_nts_pr_promo_create_pr",
							"anyof", price_rule_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}) ]
				});

				return results(search_obj);
			}

			function price_rule_min_basis_delete(price_rule_id) {
				var price_rule_min_basis_results = price_rule_min_basis_search(price_rule_id);
				var price_rule_min_basis_result;

				for (var i = 0; i < price_rule_min_basis_results.length; i++) {
					price_rule_min_basis_result = price_rule_min_basis_results[i];
					record.delete({
						type : 'customrecord_nts_pr_min_basis_cr',
						id : price_rule_min_basis_result.id
					});
				}
			}

			function price_rule_min_basis_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_pr_min_basis_cr",
					filters : [ [ "custrecord_nts_mb_price_rule_cr", "anyof",
							price_rule_id ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "name",
						label : "Name"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_delete(price_rule_id) {
				var alt_price_rule_results = alt_price_rule_search(price_rule_id);
				
				var alt_price_rule_result;

				for (var i = 0; i < alt_price_rule_results.length; i++) {
					alt_price_rule_result = alt_price_rule_results[i];
									
					alt_price_rule_tier_delete(alt_price_rule_result.id);
					alt_price_rule_promo_delete(alt_price_rule_result.id);
					alt_price_rule_min_basis_delete(alt_price_rule_result.id);					
					
					record.delete({
						type : 'customrecord_nts_alt_price_rule_create',
						id : alt_price_rule_result.id
					});
				}
			}

			function alt_price_rule_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_create",
					filters : [ [ "custrecord_nts_alt_pr_create_price_rule", "anyof",
							price_rule_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_tier_delete(price_rule_id) {
				var price_rule_tier_results = alt_price_rule_tier_search(price_rule_id);
				
				var price_rule_tier_result;
				for (var i = 0; i < price_rule_tier_results.length; i++) {
					price_rule_tier_result = price_rule_tier_results[i];
					record.delete({
						type : 'customrecord_nts_alt_price_rule_tier_cr',
						id : price_rule_tier_result.id
					});
				}
			}

			function alt_price_rule_tier_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_tier_cr",
					filters : [
							[ "custrecord_nts_alt_tier_cr_price_rule", "anyof",
									price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_promo_delete(price_rule_id) {
				var price_rule_promo_results = alt_price_rule_promo_search(price_rule_id);
				
				var price_rule_promo_result;

				for (var i = 0; i < price_rule_promo_results.length; i++) {
					price_rule_promo_result = price_rule_promo_results[i];
					record.delete({
						type : 'customrecord_nts_alt_price_rule_promo_cr',
						id : price_rule_promo_result.id
					});
				}
			}

			function alt_price_rule_promo_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_promo_cr",
					filters : [ [ "custrecord_nts_alt_pr_promo_cr_pr",
							"anyof", price_rule_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_min_basis_delete(price_rule_id) {
				var price_rule_min_basis_results = alt_price_rule_min_basis_search(price_rule_id);
				
				var price_rule_min_basis_result;

				for (var i = 0; i < price_rule_min_basis_results.length; i++) {
					price_rule_min_basis_result = price_rule_min_basis_results[i];
					record.delete({
						type : 'customrecord_nts_alt_pr_min_basis_cr',
						id : price_rule_min_basis_result.id
					});
				}
			}

			function alt_price_rule_min_basis_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_pr_min_basis_cr",
					filters : [ [ "custrecord_nts_alt_price_rule_create", "anyof",
							price_rule_id ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "name",
						label : "Name"
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
				getInputData : getInputData,
				map : map,
				reduce : reduce,
				summarize : summarize
			};

		});
