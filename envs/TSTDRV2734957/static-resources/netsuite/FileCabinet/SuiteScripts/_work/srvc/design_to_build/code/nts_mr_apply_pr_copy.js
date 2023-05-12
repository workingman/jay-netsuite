/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			var from_customer = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_from_customer'
			})

			var limit = 50;
			var limit_counter = 0;
			var limit_key = 1;

			function getInputData() {
				try {
					var customer_method = runtime.getCurrentScript()
							.getParameter({
								name : 'custscript_nts_customer_method'
							})
					var customer_input = runtime.getCurrentScript()
							.getParameter({
								name : 'custscript_nts_customer_input'
							})

					var input_data;

					switch (customer_method) {
					case 'to_customer':
						input_data = handle_to_customer(customer_input);
						break;
					case 'to_affiliation':
						input_data = handle_to_affiliation(customer_input);
						break;
					case 'to_customer_search':
						input_data = handle_to_customer_search(customer_input);
						break;
					default:
						input_data = [];
					}

					return input_data;
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}

			}

			function handle_to_customer(customer_input) {
				return [ {
					id : customer_input
				} ];
			}

			function handle_to_affiliation(customer_input) {
				return customer_affiliation_search(customer_input);
			}

			function handle_to_customer_search(customer_input) {
				return results(search.load({
					id : customer_input
				}));
			}

			function map(context) {
				try {
					var to_customer = context.value;

					var price_rule_results = customer_price_rule_search(from_customer);
					var price_rule_result;

					for (var i = 0; i < price_rule_results.length; i++) {
						price_rule_result = price_rule_results[i];

						limit_counter = limit_counter + 1;

						if (limit_counter == limit) {
							limit_key = limit_key + 1;
							limit_counter = 0;
						}

						context.write({
							key : {
								from_customer : from_customer,
								to_customer : to_customer,
								limit_key : limit_key
							},
							value : {
								price_rule_result : price_rule_result
							}
						});
					}

				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function reduce(context) {
				try {

					var from_customer = JSON.parse(context.key).from_customer;
					var to_customer = JSON
							.parse(JSON.parse(context.key).to_customer);
					var values = context.values;

					var duplicate_price_rule_results;
					var item_id;

					for (var i = 0; i < values.length; i++) {
						price_rule_result = JSON.parse(values[i]).price_rule_result
						item_id = price_rule_result.values.custrecord_nts_pr_item[0].value;
						if (!duplicate_price_rule(to_customer.id, item_id)) {
							copy_price_rule(price_rule_result, to_customer.id);
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

			function copy_price_rule(price_rule_result, to_customer) {

				var price_rule = price_rule_create(to_customer,
						price_rule_result);

				price_rule_alt_create(price_rule_result.id, price_rule);

				price_rule_tier_create(price_rule_result.id, price_rule);

				price_rule_promo_create(price_rule_result.id, price_rule);

				price_rule_min_basis_create(price_rule_result.id, price_rule);
			}

			function price_rule_create(customer, price_rule_create_result) {
				var price_rule = record.create({
					type : 'customrecord_nts_price_rule',
					isDynamic : true
				});

				price_rule.setValue({
					fieldId : 'custrecord_nts_pr_customer',
					value : customer
				});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_start_date',
							value : new Date(
									price_rule_create_result.values.custrecord_nts_pr_start_date)
						});
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_end_date)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_end_date',
								value : new Date(
										price_rule_create_result.values.custrecord_nts_pr_end_date)
							});
				}

				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_item',
							value : price_rule_result.values.custrecord_nts_pr_item[0].value
						});

				price_rule.setValue({
					fieldId : 'name',
					value : price_rule_create_result.values.name
				});

				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_type',
							value : price_rule_create_result.values.custrecord_nts_pr_type[0].value
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_calculation_method',
							value : price_rule_create_result.values.custrecord_nts_pr_calculation_method[0].value
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_calculation_basis',
							value : price_rule_create_result.values.custrecord_nts_pr_calculation_basis[0].value
						});

				if (price_rule_create_result.values.custrecord_nts_pr_tier_basis.length > 0) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_tier_basis',
								value : price_rule_create_result.values.custrecord_nts_pr_tier_basis[0].value
							});
				}
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_margin_percent',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_markup_percent)
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_markup_percent',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_margin_percent)
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_markup_amount',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_markup_amount)
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_discount_amount',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_discount_amount)
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_discount_percent',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_discount_amount)
						});
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_fixed_price',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_fixed_price)
						});

				price_rule.save();

				return price_rule
			}

			function price_rule_alt_create(price_rule_id, price_rule) {

				var price_rule_alt_results = alt_price_rule_search(price_rule_id);
				var price_rule_alt_result;
				var price_rule_alt;

				for (var i = 0; i < price_rule_alt_results.length; i++) {
					price_rule_alt_result = price_rule_alt_results[i];

					var alt_price_rule = record.create({
						type : 'customrecord_nts_alt_price_rule',
						isDynamic : true
					});

					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_price_rule',
						value : price_rule.id
					});

					alt_price_rule.setValue({
						fieldId : 'name',
						value : price_rule.getValue({
							fieldId : 'name'
						})
					});

					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_start_date',
						value : new Date(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_start_date'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_end_date',
						value : new Date(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_end_date'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_type',
						value : price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_type'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_calculation_method',
						value : price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_calculation_method'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_calculation_basis',
						value : price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_calculation_basis'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_basis',
						value : price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_tier_basis'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_margin_percent',
						value : parseFloat(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_margin_percent'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_markup_percen',
						value : parseFloat(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_markup_percen'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_markup_amount',
						value : parseFloat(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_markup_amount'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_discount_amount',
						value : parseFloat(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_discount_amount'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_discount_percent',
						value : parseFloat(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_discount_percent'
						}))
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_fixed_price',
						value : parseFloat(price_rule_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_fixed_price'
						}))
					});

					alt_price_rule.save();

					alt_price_rule_tier_create(price_rule_alt_result.id,
							alt_price_rule);

					alt_price_rule_promo_create(price_rule_alt_result.id,
							alt_price_rule);

					alt_price_rule_min_basis_create(price_rule_alt_result.id,
							alt_price_rule);

				}

			}

			function price_rule_tier_create(price_rule_id, price_rule) {
				var price_rule_tier_results = price_rule_tier_search(price_rule_id);
				var price_rule_tier_result;
				var price_rule_tier;

				for (var i = 0; i < price_rule_tier_results.length; i++) {
					price_rule_tier_result = price_rule_tier_results[i];

					var price_rule_tier = record.create({
						type : 'customrecord_nts_price_rule_qty_tier',
						isDynamic : true
					});

					price_rule_tier.setValue({
						fieldId : 'name',
						value : price_rule_tier_result.getValue({
							name : 'name'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_prqt_price_rule',
						value : price_rule.id
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_prqt_starting_quantity',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_prqt_starting_quantity'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_prqt_qty_price',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_prqt_qty_price'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_pr_tier_percent',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_pr_tier_percent'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_pr_tier_amount',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_pr_tier_amount'
						})
					});

					price_rule_tier.save();
				}
			}

			function price_rule_promo_create(price_rule_id, price_rule) {
				var price_rule_promo_results = price_rule_promo_search(price_rule_id);
				var price_rule_promo_result;
				var price_rule_promo;

				for (var i = 0; i < price_rule_promo_results.length; i++) {
					price_rule_promo_result = price_rule_promo_results[i];

					var price_rule_promo = record.create({
						type : 'customrecord_nts_price_rule_promo',
						isDynamic : true
					});

					price_rule_promo.setValue({
						fieldId : 'name',
						value : price_rule_promo_result.getValue({
							name : 'name'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_price_rule',
						value : price_rule.id
					});

					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_min_quantity',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_min_quantity'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_max_quantity',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_max_quantity'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_code',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_code'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_quantity',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_quantity'
						})
					});

					price_rule_promo.save();
				}
			}

			function price_rule_min_basis_create(price_rule_id, price_rule) {
				var price_rule_min_basis_results = price_rule_min_basis_search(price_rule_id);
				var price_rule_min_basis_result;
				var price_rule_min_basis;

				for (var i = 0; i < price_rule_min_basis_results.length; i++) {
					price_rule_min_basis_result = price_rule_min_basis_results[i];

					var price_rule_min_basis = record.create({
						type : 'customrecord_nts_pr_min_basis',
						isDynamic : true
					});

					price_rule_min_basis.setValue({
						fieldId : 'name',
						value : price_rule_min_basis_result.getValue({
							name : 'name'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_price_rule',
						value : price_rule.id
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_uom',
						value : price_rule_min_basis_result.getValue({
							name : 'custrecord_nts_mb_uom'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_threshold',
						value : price_rule_min_basis_result.getValue({
							name : 'custrecord_nts_mb_threshold'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_item',
						value : price_rule_min_basis_result.getValue({
							name : 'custrecord_nts_mb_item'
						})
					});

					price_rule_min_basis.save();
				}
			}

			function alt_price_rule_tier_create(alt_price_rule_id,
					alt_price_rule) {
				var price_rule_tier_results = alt_price_rule_tier_search(alt_price_rule_id);
				var price_rule_tier_result;
				var price_rule_tier;

				for (var i = 0; i < price_rule_tier_results.length; i++) {
					price_rule_tier_result = price_rule_tier_results[i];

					var price_rule_tier = record.create({
						type : 'customrecord_nts_alt_price_rule_tier',
						isDynamic : true
					});

					price_rule_tier.setValue({
						fieldId : 'name',
						value : price_rule_tier_result.getValue({
							name : 'name'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_price_rule',
						value : alt_price_rule.id
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_starting_tier',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_alt_pr_starting_tier'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_price',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_alt_pr_tier_price'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_percent',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_alt_pr_tier_percent'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_amount',
						value : price_rule_tier_result.getValue({
							name : 'custrecord_nts_alt_pr_tier_amount'
						})
					});

					price_rule_tier.save();
				}
			}

			function alt_price_rule_promo_create(alt_price_rule_id,
					alt_price_rule) {
				var price_rule_promo_results = alt_price_rule_promo_search(alt_price_rule_id);
				var price_rule_promo_result;
				var price_rule_promo;

				for (var i = 0; i < price_rule_promo_results.length; i++) {
					price_rule_promo_result = price_rule_promo_results[i];

					var price_rule_promo = record.create({
						type : 'customrecord_nts_alt_price_rule_promo',
						isDynamic : true
					});

					price_rule_promo.setValue({
						fieldId : 'name',
						value : price_rule_promo_result.getValue({
							name : 'name'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_price_rule',
						value : alt_price_rule.id
					});

					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_min_quantity',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_min_quantity'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_max_quantity',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_max_quantity'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_code',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_code'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_quantity',
						value : price_rule_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_quantity'
						})
					});

					price_rule_promo.save();
				}
			}

			function alt_price_rule_min_basis_create(alt_price_rule_id,
					alt_price_rule) {
				var price_rule_min_basis_results = alt_price_rule_min_basis_search(alt_price_rule_id);
				var price_rule_min_basis_result;
				var price_rule_min_basis;

				for (var i = 0; i < price_rule_min_basis_results.length; i++) {
					price_rule_min_basis_result = price_rule_min_basis_results[i];

					var price_rule_min_basis = record.create({
						type : 'customrecord_nts_alt_pr_min_basis',
						isDynamic : true
					});

					price_rule_min_basis.setValue({
						fieldId : 'name',
						value : price_rule_min_basis_result.getValue({
							name : 'name'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_price_rule',
						value : alt_price_rule.id
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_uom',
						value : price_rule_min_basis_result.getValue({
							name : 'custrecord_nts_alt_mb_uom_cr'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_threshold',
						value : price_rule_min_basis_result.getValue({
							name : 'custrecord_nts_alt_mb_threshold_cr'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_item',
						value : price_rule_min_basis_result.getValue({
							name : 'custrecord_nts_alt_mb_item_cr'
						})
					});

					price_rule_min_basis.save();
				}
			}

			function customer_price_rule_search(customer_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule",
					filters : [ [ "custrecord_nts_pr_customer", "anyof",
							customer_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_start_date",
						label : "Start Date"
					}), search.createColumn({
						name : "custrecord_nts_pr_end_date",
						label : "End Date"
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
						name : "custrecord_nts_pr_rate",
						label : "Rate"
					}), search.createColumn({
						name : "custrecord_nts_pr_margin_percent",
						label : "Margin %"
					}), search.createColumn({
						name : "custrecord_nts_pr_markup_percent",
						label : "Markup %"
					}), search.createColumn({
						name : "custrecord_nts_pr_markup_amount",
						label : "Markup Amount"
					}), search.createColumn({
						name : "custrecord_nts_pr_discount_percent",
						label : "Discount %"
					}), search.createColumn({
						name : "custrecord_nts_pr_discount_amount",
						label : "Discount Amount"
					}), search.createColumn({
						name : "custrecord_nts_pr_fixed_price",
						label : "Fixed Price"
					}), search.createColumn({
						name : "custrecord_nts_pr_tier_basis",
						label : "Tier Basis"
					}), search.createColumn({
						name : "custrecord_nts_pr_type",
						label : "Type"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_search(alt_price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule",
					filters : [
							[ "custrecord_nts_alt_pr_price_rule", "anyof",
									alt_price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_start_date",
						label : "Start Date"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_end_date",
						label : "End Date"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_price_rule",
						label : "Price Rule"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_calculation_method",
						label : "Calculation Method"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_calculation_basis",
						label : "Calculation Basis"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_rate",
						label : "Rate"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_margin_percent",
						label : "Margin %"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_markup_percent",
						label : "Markup %"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_markup_amount",
						label : "Markup Amount"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_discount_percent",
						label : "Discount %"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_discount_amount",
						label : "Discount Amount"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_fixed_price",
						label : "Fixed Price"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_tier_basis",
						label : "Tier Basis"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_tier_search(alt_price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_tier",
					filters : [
							[ "custrecord_nts_alt_price_rule", "anyof",
									alt_price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_starting_tier",
						label : "Starting Tier"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_tier_price",
						label : "Tier Price"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_tier_percent",
						label : "Tier Percent"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_tier_amount",
						label : "Tier Amount"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_promo_search(alt_price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_promo",
					filters : [
							[ "custrecord_nts_alt_pr_promo_price_rule",
									"anyof", alt_price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_price_rule",
						label : "Alt Price Rule"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_min_quantity",
						label : "Min Quantity"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_max_quantity",
						label : "Max Quantity"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_code",
						label : "Promo Code"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_quantity",
						label : "Promo Quantity"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_min_basis_search(alt_price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_pr_min_basis",
					filters : [
							[ "custrecord_nts_alt_mb_price_rule", "anyof",
									alt_price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
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

			function duplicate_price_rule(customer_id, item_id) {
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

				return results(search_obj).length > 0;
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
					}), search.createColumn({
						name : "custrecord_nts_pr_tier_percent",
						label : "Tier Percent"
					}), search.createColumn({
						name : "custrecord_nts_pr_tier_amount",
						label : "Tier Amount"
					}) ]
				});

				return results(search_obj);
			}

			function price_rule_promo_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_promo",
					filters : [
							[ "custrecord_nts_pr_promo_price_rule", "anyof",
									price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
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
						name : "custrecord_nts_pr_promo_code",
						label : "Promo Code"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_quantity",
						label : "Promo Quantity"
					}) ]
				});

				return results(search_obj);
			}

			function price_rule_min_basis_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_pr_min_basis",
					filters : [
							[ "custrecord_nts_mb_price_rule", "anyof",
									price_rule_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
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
