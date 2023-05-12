/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			var price_rule_update_id = runtime.getCurrentScript().getParameter(
					{
						name : 'custscript_nts_price_rule_update'
					})

			var limit = 50;
			var limit_counter = 0;
			var limit_key = 1;

			function getInputData() {
				try {
					var customer;
					var item;
					var customer_method = runtime.getCurrentScript()
							.getParameter({
								name : 'custscript_nts_update_customer_method'
							})
					var customer_input = runtime.getCurrentScript()
							.getParameter({
								name : 'custscript_nts_update_customer_input'
							})
					var item_method = runtime.getCurrentScript().getParameter({
						name : 'custscript_nts_update_item_method'
					})
					var item_input = runtime.getCurrentScript().getParameter({
						name : 'custscript_nts_update_item_input'
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
					var duplicate_price_rule_results;
					var item;
					var price_rule_update_result = price_rule_create_search(price_rule_update_id);
					var price_rule_id;

					if (!isEmpty(price_rule_update_result)) {
						for (var i = 0; i < values.length; i++) {
							item = JSON.parse(values[i]).item
							price_rule_id = duplicate_price_rule(customer.id,
									item.id);
							if (!isEmpty(price_rule_id)) {
								update_price_rule(price_rule_id,
										price_rule_update_result);
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

			function update_price_rule(price_rule_id, price_rule_create_result) {

				var price_rule = price_rule_create(price_rule_id,
						price_rule_create_result);

				alt_price_rule_delete(price_rule.id);

				price_rule_alt_create(price_rule_create_result.id, price_rule);

				price_rule_tier_delete(price_rule.id);

				price_rule_tier_create(price_rule_create_result.id, price_rule);

				price_rule_promo_delete(price_rule.id);

				price_rule_promo_create(price_rule_create_result.id, price_rule);

				price_rule_min_basis_delete(price_rule.id);

				price_rule_min_basis_create(price_rule_create_result.id,
						price_rule);
			}

			function price_rule_create(price_rule_id, price_rule_create_result) {

				var price_rule = record.load({
					type : 'customrecord_nts_price_rule',
					id : price_rule_id,
					isDynamic : true
				});

				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_start_date)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_start_date',
								value : new Date(
										price_rule_create_result.values.custrecord_nts_pr_create_start_date)
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_end_date)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_end_date',
								value : new Date(
										price_rule_create_result.values.custrecord_nts_pr_create_end_date)
							});
				}

				if (price_rule_create_result.values.custrecord_nts_pr_create_type.length > 0) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_type',
								value : price_rule_create_result.values.custrecord_nts_pr_create_type[0].value
							});
				}
				if (price_rule_create_result.values.custrecord_nts_pr_create_calc_method.length > 0) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_calculation_method',
								value : price_rule_create_result.values.custrecord_nts_pr_create_calc_method[0].value
							});
				}
				if (price_rule_create_result.values.custrecord_nts_pr_create_calc_basis.length > 0) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_calculation_basis',
								value : price_rule_create_result.values.custrecord_nts_pr_create_calc_basis[0].value
							});
				}
				if (price_rule_create_result.values.custrecord_nts_pr_create_tier_basis.length > 0) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_tier_basis',
								value : price_rule_create_result.values.custrecord_nts_pr_create_tier_basis[0].value
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_margin_percent)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_margin_percent',
								value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_margin_percent)
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_markup_percent)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_markup_percent',
								value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_markup_percent)
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_markup_amount)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_markup_amount',
								value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_markup_amount)
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_discount_amount)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_discount_amount',
								value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_discount_amount)
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_disc_percent)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_discount_percent',
								value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_disc_percent)
							});
				}
				if (!isEmpty(price_rule_create_result.values.custrecord_nts_pr_create_fixed_price)) {
					price_rule
							.setValue({
								fieldId : 'custrecord_nts_pr_fixed_price',
								value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_fixed_price)
							});
				}
				if(price_rule_create_result.values.custrecord_nts_pr_create_sel_uom.length > 0){
					price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_selected_uom',
							value : price_rule_create_result.values.custrecord_nts_pr_create_sel_uom[0].value
						});
				}
				price_rule
						.setValue({
							fieldId : 'custrecord_nts_pr_specified_threshold',
							value : parseFloat(price_rule_create_result.values.custrecord_nts_pr_create_sp_threshol)
						});

				price_rule.save();

				return price_rule
			}

			function price_rule_alt_create(price_rule_create_id, price_rule) {

				var price_rule_create_alt_results = price_rule_create_alt_search(price_rule_create_id);
				var price_rule_create_alt_result;
				var price_rule_alt;

				for (var i = 0; i < price_rule_create_alt_results.length; i++) {
					price_rule_create_alt_result = price_rule_create_alt_results[i];

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

					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_start_date',
								value : new Date(
										price_rule_create_alt_result
												.getValue({
													name : 'custrecord_nts_alt_pr_create_start_date'
												}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_end_date',
								value : new Date(
										price_rule_create_alt_result
												.getValue({
													name : 'custrecord_nts_alt_pr_create_end_date'
												}))
							});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_type',
						value : price_rule_create_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_create_type'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_calculation_method',
						value : price_rule_create_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_create_calc_method'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_calculation_basis',
						value : price_rule_create_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_create_calc_basis'
						})
					});
					alt_price_rule.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_basis',
						value : price_rule_create_alt_result.getValue({
							name : 'custrecord_nts_alt_pr_create_tier_basis'
						})
					});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_margin_percent',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_margin_pct'
										}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_markup_percen',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_markup_pct'
										}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_markup_amount',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_markup_amt'
										}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_discount_amount',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_disc_amount'
										}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_discount_percent',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_disc_pct'
										}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_fixed_price',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_fixed_price'
										}))
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_selected_uom',
								value : price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_sel_uom'
										})
							});
					alt_price_rule
							.setValue({
								fieldId : 'custrecord_nts_alt_pr_specified_threshol',
								value : parseFloat(price_rule_create_alt_result
										.getValue({
											name : 'custrecord_nts_alt_pr_create_sp_threshol'
										}))
							});

					alt_price_rule.save();

					alt_price_rule_tier_create(price_rule_create_alt_result.id,
							alt_price_rule);

					alt_price_rule_promo_create(
							price_rule_create_alt_result.id, alt_price_rule);

					alt_price_rule_min_basis_create(
							price_rule_create_alt_result.id, alt_price_rule);

				}

			}

			function price_rule_tier_create(price_rule_create_id, price_rule) {
				var price_rule_create_tier_results = price_rule_create_tier_search(price_rule_create_id);
				var price_rule_create_tier_result;
				var price_rule_tier;

				for (var i = 0; i < price_rule_create_tier_results.length; i++) {
					price_rule_create_tier_result = price_rule_create_tier_results[i];

					var price_rule_tier = record.create({
						type : 'customrecord_nts_price_rule_qty_tier',
						isDynamic : true
					});

					price_rule_tier.setValue({
						fieldId : 'name',
						value : price_rule_create_tier_result.getValue({
							name : 'name'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_prqt_price_rule',
						value : price_rule.id
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_prqt_starting_quantity',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_tier_create_starting_tier'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_prqt_qty_price',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_tier_create_price'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_pr_tier_percent',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_tier_create_percent'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_pr_tier_amount',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_tier_create_amount'
						})
					});

					price_rule_tier.save();
				}
			}

			function price_rule_promo_create(price_rule_create_id, price_rule) {
				var price_rule_create_promo_results = price_rule_create_promo_search(price_rule_create_id);
				var price_rule_create_promo_result;
				var price_rule_promo;

				for (var i = 0; i < price_rule_create_promo_results.length; i++) {
					price_rule_create_promo_result = price_rule_create_promo_results[i];

					var price_rule_promo = record.create({
						type : 'customrecord_nts_price_rule_promo',
						isDynamic : true
					});

					price_rule_promo.setValue({
						fieldId : 'name',
						value : price_rule_create_promo_result.getValue({
							name : 'name'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_price_rule',
						value : price_rule.id
					});

					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_min_quantity',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_create_min_qty'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_max_quantity',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_create_max_qty'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_code',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_create_code'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_pr_promo_quantity',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_pr_promo_create_qty'
						})
					});

					price_rule_promo.save();
				}
			}

			function price_rule_min_basis_create(price_rule_create_id,
					price_rule) {
				var price_rule_create_min_basis_results = price_rule_create_min_basis_search(price_rule_create_id);
				var price_rule_create_min_basis_result;
				var price_rule_min_basis;

				for (var i = 0; i < price_rule_create_min_basis_results.length; i++) {
					price_rule_create_min_basis_result = price_rule_create_min_basis_results[i];

					var price_rule_min_basis = record.create({
						type : 'customrecord_nts_pr_min_basis',
						isDynamic : true
					});

					price_rule_min_basis.setValue({
						fieldId : 'name',
						value : price_rule_create_min_basis_result.getValue({
							name : 'name'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_price_rule',
						value : price_rule.id
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_uom',
						value : price_rule_create_min_basis_result.getValue({
							name : 'custrecord_nts_mb_uom_cr'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_threshold',
						value : price_rule_create_min_basis_result.getValue({
							name : 'custrecord_nts_mb_threshold_cr'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_mb_item',
						value : price_rule_create_min_basis_result.getValue({
							name : 'custrecord_nts_mb_item_cr'
						})
					});

					price_rule_min_basis.save();
				}
			}

			function alt_price_rule_tier_create(alt_price_rule_create_id,
					alt_price_rule) {
				var price_rule_create_tier_results = alt_price_rule_create_tier_search(alt_price_rule_create_id);
				var price_rule_create_tier_result;
				var price_rule_tier;

				for (var i = 0; i < price_rule_create_tier_results.length; i++) {
					price_rule_create_tier_result = price_rule_create_tier_results[i];

					var price_rule_tier = record.create({
						type : 'customrecord_nts_alt_price_rule_tier',
						isDynamic : true
					});

					price_rule_tier.setValue({
						fieldId : 'name',
						value : price_rule_create_tier_result.getValue({
							name : 'name'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_price_rule',
						value : alt_price_rule.id
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_starting_tier',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_alt_tier_cr_starting_tier'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_price',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_alt_tier_cr_price'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_percent',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_alt_tier_cr_percent'
						})
					});
					price_rule_tier.setValue({
						fieldId : 'custrecord_nts_alt_pr_tier_amount',
						value : price_rule_create_tier_result.getValue({
							name : 'custrecord_nts_alt_tier_cr_amount'
						})
					});

					price_rule_tier.save();
				}
			}

			function alt_price_rule_promo_create(alt_price_rule_create_id,
					alt_price_rule) {
				var price_rule_create_promo_results = alt_price_rule_create_promo_search(alt_price_rule_create_id);
				var price_rule_create_promo_result;
				var price_rule_promo;

				for (var i = 0; i < price_rule_create_promo_results.length; i++) {
					price_rule_create_promo_result = price_rule_create_promo_results[i];

					var price_rule_promo = record.create({
						type : 'customrecord_nts_alt_price_rule_promo',
						isDynamic : true
					});

					price_rule_promo.setValue({
						fieldId : 'name',
						value : price_rule_create_promo_result.getValue({
							name : 'name'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_price_rule',
						value : alt_price_rule.id
					});

					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_min_quantity',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_cr_min_qty'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_max_quantity',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_cr_max_qty'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_code',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_cr_code'
						})
					});
					price_rule_promo.setValue({
						fieldId : 'custrecord_nts_alt_pr_promo_quantity',
						value : price_rule_create_promo_result.getValue({
							name : 'custrecord_nts_alt_pr_promo_cr_qty'
						})
					});

					price_rule_promo.save();
				}
			}

			function alt_price_rule_min_basis_create(alt_price_rule_create_id,
					alt_price_rule) {
				var price_rule_create_min_basis_results = alt_price_rule_create_min_basis_search(alt_price_rule_create_id);
				var price_rule_create_min_basis_result;
				var price_rule_min_basis;

				for (var i = 0; i < price_rule_create_min_basis_results.length; i++) {
					price_rule_create_min_basis_result = price_rule_create_min_basis_results[i];

					var price_rule_min_basis = record.create({
						type : 'customrecord_nts_alt_pr_min_basis',
						isDynamic : true
					});

					price_rule_min_basis.setValue({
						fieldId : 'name',
						value : price_rule_create_min_basis_result.getValue({
							name : 'name'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_price_rule',
						value : alt_price_rule.id
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_uom',
						value : price_rule_create_min_basis_result.getValue({
							name : 'custrecord_nts_alt_mb_uom_cr'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_threshold',
						value : price_rule_create_min_basis_result.getValue({
							name : 'custrecord_nts_alt_mb_threshold_cr'
						})
					});
					price_rule_min_basis.setValue({
						fieldId : 'custrecord_nts_alt_mb_item',
						value : price_rule_create_min_basis_result.getValue({
							name : 'custrecord_nts_alt_mb_item_cr'
						})
					});

					price_rule_min_basis.save();
				}
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
						name : "custrecord_nts_pr_group",
						label : "Customer Group"
					}), search.createColumn({
						name : "custrecord_nts_pr_item",
						label : "Item"
					}), search.createColumn({
						name : "custrecord_nts_pr_item_group",
						label : "Item Group"
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
						name : "custrecord_nts_pr_priority",
						label : "Priority"
					}) ]
				});

				price_rule_results = results(search_obj);

				if (price_rule_results.length > 0) {
					price_rule_result_id = price_rule_results[0].id;
				}

				return price_rule_result_id;
			}

			function price_rule_create_alt_search(price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_create",
					filters : [
							[ "custrecord_nts_alt_pr_create_price_rule",
									"anyof", price_rule_create_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_start_date",
						label : "Start Date"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_end_date",
						label : "End Date"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_price_rule",
						label : "Price Rule Create"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_calc_method",
						label : "Calculation Method"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_calc_basis",
						label : "Calculation Basis"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_rate",
						label : "Rate"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_margin_pct",
						label : "Margin %"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_markup_pct",
						label : "Markup %"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_markup_amt",
						label : "Markup Amount"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_disc_pct",
						label : "Discount %"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_disc_amount",
						label : "Discount Amount"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_fixed_price",
						label : "Fixed Price"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_tier_basis",
						label : "Tier Basis"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_type",
						label : "Type"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_sel_uom",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_sp_item",
						label : "Min-Basis Item"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_sp_item_gro",
						label : "Min-Basis Item Group"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_sp_item_sea",
						label : "Min-Basis Item Search"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_create_sp_threshol",
						label : "Minimum Value"
					})  ]
				});

				return results(search_obj);
			}

			function price_rule_create_tier_search(price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_tier_create",
					filters : [
							[ "custrecord_nts_tier_create_price_rule", "anyof",
									price_rule_create_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_tier_create_price_rule",
						label : "Price Rule Create"
					}), search.createColumn({
						name : "custrecord_nts_tier_create_starting_tier",
						label : "Starting Tier"
					}), search.createColumn({
						name : "custrecord_nts_tier_create_price",
						label : "Tier Price"
					}), search.createColumn({
						name : "custrecord_nts_tier_create_percent",
						label : "Tier Percent"
					}), search.createColumn({
						name : "custrecord_nts_tier_create_amount",
						label : "Tier Amount"
					}) ]
				});

				return results(search_obj);
			}

			function price_rule_create_promo_search(price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_promo_create",
					filters : [ [ "custrecord_nts_pr_promo_create_pr", "anyof",
							price_rule_create_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_create_pr",
						label : "Price Rule Create"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_create_min_qty",
						label : "Min Quantity"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_create_max_qty",
						label : "Max Quantity"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_create_code",
						label : "Promo Code"
					}), search.createColumn({
						name : "custrecord_nts_pr_promo_create_qty",
						label : "Promo Quantity"
					}) ]
				});

				return results(search_obj);
			}

			function price_rule_create_min_basis_search(price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_pr_min_basis_cr",
					filters : [ [ "custrecord_nts_mb_price_rule_cr", "anyof",
							price_rule_create_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_mb_uom_cr",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_mb_threshold_cr",
						label : "Minimum Value"
					}), search.createColumn({
						name : "custrecord_nts_mb_item_cr",
						label : "Min-Basis Item"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_create_tier_search(alt_price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_tier_cr",
					filters : [
							[ "custrecord_nts_alt_tier_cr_price_rule", "anyof",
									alt_price_rule_create_id ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_tier_cr_price_rule",
						label : "Alt Price Rule Create"
					}), search.createColumn({
						name : "custrecord_nts_alt_tier_cr_starting_tier",
						label : "Starting Tier"
					}), search.createColumn({
						name : "custrecord_nts_alt_tier_cr_price",
						label : "Tier Price"
					}), search.createColumn({
						name : "custrecord_nts_alt_tier_cr_percent",
						label : "Tier Percent"
					}), search.createColumn({
						name : "custrecord_nts_alt_tier_cr_amount",
						label : "Tier Amount"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_create_promo_search(
					alt_price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_promo_cr",
					filters : [ [ "custrecord_nts_alt_pr_promo_cr_pr", "anyof",
							alt_price_rule_create_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_cr_pr",
						label : "Alt Price Rule Create"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_cr_min_qty",
						label : "Min Quantity"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_cr_max_qty",
						label : "Max Quantity"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_cr_code",
						label : "Promo Code"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_cr_qty",
						label : "Promo Quantity"
					}) ]
				});

				return results(search_obj);
			}

			function alt_price_rule_create_min_basis_search(
					alt_price_rule_create_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_pr_min_basis_cr",
					filters : [ [ "custrecord_nts_alt_price_rule_create",
							"anyof", alt_price_rule_create_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_uom_cr",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_threshold_cr",
						label : "Minimum Value"
					}), search.createColumn({
						name : "custrecord_nts_alt_mb_item_cr",
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

			function item_group_search(item_group) {
				var search_obj = search
						.create({
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
							}) ]
						});

				return results(search_obj);
			}

			function price_rule_create_search(price_rule_create_id) {
				var price_rule_create_results;
				var price_rule_create_result;
				var search_obj = search.create({
					type : "customrecord_nts_price_rule_create",
					filters : [
							[ "isinactive", "is", "F" ],
							"AND",
							[ "internalidnumber", "equalto",
									price_rule_create_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_start_date",
						label : "Start Date"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_end_date",
						label : "End Date"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_type",
						label : "Type"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_item",
						label : "Item"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_calc_method",
						label : "Calculation Method"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_calc_basis",
						label : "Calculation Method"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_tier_basis",
						label : "Tier Basis"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_margin_percent",
						label : "Margin %"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_markup_percent",
						label : "Markup %"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_markup_amount",
						label : "Markup Amount"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_discount_amount",
						label : "Discount Amount"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_fixed_price",
						label : "Fixed Price"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_disc_percent",
						label : "Discount %"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_sel_uom",
						label : "Minimum UOM"
					}), search.createColumn({
						name : "custrecord_nts_pr_create_sp_threshol",
						label : "Minimum Value"
					})  ]
				});

				price_rule_create_results = results(search_obj);

				if (price_rule_create_results.length > 0) {
					price_rule_create_result = JSON.parse(JSON
							.stringify(price_rule_create_results[0]));
				}

				return price_rule_create_result;
			}

			function apply_name(priceRule) {
				priceRule.setValue({
					fieldId : 'name',
					value : item_name_search(priceRule.getValue({
						fieldId : 'custrecord_nts_pr_item'
					}))
				});
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

			function price_rule_tier_delete(price_rule_id) {
				var price_rule_tier_results = price_rule_tier_search(price_rule_id);
				var price_rule_tier_result;
				for (var i = 0; i < price_rule_tier_results.length; i++) {
					price_rule_tier_result = price_rule_tier_results[i];
					record.delete({
						type : 'customrecord_nts_price_rule_qty_tier',
						id : price_rule_tier_result.id
					});
				}
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
						type : 'customrecord_nts_price_rule_promo',
						id : price_rule_promo_result.id
					});
				}
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
						type : 'customrecord_nts_pr_min_basis',
						id : price_rule_min_basis_result.id
					});
				}
			}

			function price_rule_min_basis_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_pr_min_basis",
					filters : [ [ "custrecord_nts_mb_price_rule", "anyof",
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
						type : 'customrecord_nts_alt_price_rule',
						id : alt_price_rule_result.id
					});
				}
			}

			function alt_price_rule_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule",
					filters : [ [ "custrecord_nts_alt_pr_price_rule", "anyof",
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
						type : 'customrecord_nts_alt_price_rule_tier',
						id : price_rule_tier_result.id
					});
				}
			}

			function alt_price_rule_tier_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_tier",
					filters : [
							[ "custrecord_nts_alt_price_rule", "anyof",
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
						type : 'customrecord_nts_alt_price_rule_promo',
						id : price_rule_promo_result.id
					});
				}
			}

			function alt_price_rule_promo_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule_promo",
					filters : [ [ "custrecord_nts_alt_pr_promo_price_rule",
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
						type : 'customrecord_nts_alt_pr_min_basis',
						id : price_rule_min_basis_result.id
					});
				}
			}

			function alt_price_rule_min_basis_search(price_rule_id) {
				var search_obj = search.create({
					type : "customrecord_nts_alt_pr_min_basis",
					filters : [ [ "custrecord_nts_alt_mb_price_rule", "anyof",
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
