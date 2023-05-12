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
 * nts_md_manage_price_rule.js
 * 
 * @NApiVersion 2.x
 */
define(
		[ 'N/record', 'N/runtime', 'N/search' ],

		function(record, runtime, search) {

			var PRICE_RULE_SEARCH = 'customsearch_nts_ss_list_price_rules';

			var CALC_BASIS = {
				base_price : 1,
				average_cost : 2,
				standard_cost : 3
			};

			var TIER_BASIS = {
				quantity : 1,
				amount : 2,
				weight : 3
			};

			var CALC_METHOD = {
				fixed_price : 1,
				markup : 2,
				margin_plus : 3,
				list_less : 4,
				tiered_pricing : 5,
				promotion : 6
			};

			var CALC_DETAILS = {
				type : '',
				quantity : '',
				percent : '',
				amount : '',
				price : '',
				promocode : '',
				promoquantity : ''
			}

			/**
			 * The system calculates the line item rate as follows: Returns the
			 * fixed price on the price rule record
			 */
			function fixed_price(priceRule, itemId, base_rate_in, trandate,
					amount, pricing_basis_json) {

				var calc_details_json = {
					type : 'fixed_price',
					quantity : '',
					price : parseFloat(priceRule.custrecord_nts_pr_fixed_price),
					percent : '',
					amount : '',
					promocode : '',
					promoquantity : ''
				};

				if (!isEmpty(trandate)) {
					var alt_pricing_json = handle_alt_price_rule(priceRule,
							itemId, base_rate_in, trandate, amount,
							pricing_basis_json);

					if (!isEmpty(alt_pricing_json)) {
						if (!isEmpty(alt_pricing_json.alt_pricing)) {
							calc_details_json = alt_calc_details(priceRule,
									trandate, base_rate_in, pricing_basis_json,
									itemId, alt_pricing_json);
						}
					}
				}

				return calc_details_json;

			}

			/**
			 * The system calculates the line item rate as follows:Checks if
			 * there is a Markup % value if so, perform the following: Sets the
			 * Cost-Plus value to the Base Price * (1 + the Markup %) Checks if
			 * there is a Markup $ value if so, perform the following: Adds the
			 * Markup $ to the Cost-Plus value Returns the Cost-Plus value
			 */
			function cost_plus(priceRule, itemId, base_rate_in, trandate,
					amount, pricing_basis_json) {
				var flCostPlus = '';
				var base_rate = base_rate_in;

				var calc_basis = priceRule.custrecord_nts_pr_calculation_basis;

				if (isEmpty(base_rate)) {
					if (calc_basis == CALC_BASIS.base_price) {
						base_rate = get_base_price(itemId);
					}
					if (calc_basis == CALC_BASIS.average_cost) {
						base_rate = get_average_cost(itemId);
					}
					if (calc_basis == CALC_BASIS.standard_cost) {
						base_rate = get_standard_cost(itemId);
					}
				}

				flCostPlus = base_rate;

				if ((!isEmpty(priceRule.custrecord_nts_pr_markup_percent))
						&& (!isNaN(parseFloat(priceRule.custrecord_nts_pr_markup_percent)))) {
					var flMarkup = parseFloat(priceRule.custrecord_nts_pr_markup_percent) / 100;

					flCostPlus = parseFloat(base_rate)
							* (1 + parseFloat(flMarkup));
				}

				if ((!isEmpty(priceRule.custrecord_nts_pr_markup_amount))
						&& (!isNaN(priceRule.custrecord_nts_pr_markup_amount))) {
					flCostPlus = parseFloat(flCostPlus)
							+ parseFloat(priceRule.custrecord_nts_pr_markup_amount);
				}

				var calc_details_json = {
					type : 'cost_plus',
					quantity : '',
					price : flCostPlus,
					percent : '',
					amount : '',
					promocode : '',
					promoquantity : ''
				};

				if (!isEmpty(trandate)) {
					var alt_pricing_json = handle_alt_price_rule(priceRule,
							itemId, base_rate_in, trandate, amount,
							pricing_basis_json);

					if (!isEmpty(alt_pricing_json)) {
						if (!isEmpty(alt_pricing_json.alt_pricing)) {
							calc_details_json = alt_calc_details(priceRule,
									trandate, base_rate_in, pricing_basis_json,
									itemId, alt_pricing_json, calc_details_json);
						}
					}
				}

				return calc_details_json;
			}

			/**
			 * The system calculates the line item rate as follows: • Checks
			 * if there is a Margin % value if so, perform the following: o Sets
			 * the Margin-Plus value to the Average Cost / (1 - the Margin %)
			 * • Returns the Margin-Plus value
			 * 
			 */
			function margin_plus(priceRule, itemId, base_rate_in, trandate,
					amount, pricing_basis_json) {
				var flMarginPlus = '';
				var base_rate = base_rate_in;

				var calc_basis = priceRule.custrecord_nts_pr_calculation_basis;

				if (isEmpty(base_rate)) {
					if (calc_basis == CALC_BASIS.base_price) {
						base_rate = get_base_price(itemId);
					}
					if (calc_basis == CALC_BASIS.average_cost) {
						base_rate = get_average_cost(itemId);
					}
					if (calc_basis == CALC_BASIS.standard_cost) {
						base_rate = get_standard_cost(itemId);
					}
				}

				if ((!isEmpty(priceRule.custrecord_nts_pr_margin_percent))
						&& (!isNaN(parseFloat(priceRule.custrecord_nts_pr_margin_percent)))) {
					var flMargin = parseFloat(priceRule.custrecord_nts_pr_margin_percent) / 100;
					flMarginPlus = parseFloat(base_rate) / (1 - flMargin);
				}

				var calc_details_json = {
					type : 'margin_plus',
					quantity : '',
					price : flMarginPlus,
					percent : '',
					amount : '',
					promocode : '',
					promoquantity : ''
				};

				if (!isEmpty(trandate)) {
					var alt_pricing_json = handle_alt_price_rule(priceRule,
							itemId, base_rate_in, trandate, amount,
							pricing_basis_json);

					if (!isEmpty(alt_pricing_json)) {
						if (!isEmpty(alt_pricing_json.alt_pricing)) {
							calc_details_json = alt_calc_details(priceRule,
									trandate, base_rate_in, pricing_basis_json,
									itemId, alt_pricing_json, calc_details_json);
						}
					}
				}

				return calc_details_json;

			}

			/**
			 * Checks if there is a Discount % value if so, perform the
			 * following: Sets the List-Less value to the Base Price * (1 - the
			 * Discount %) Checks if there is a Discount $ value if so, perform
			 * the following: Subtracts the Discount $ to the List-Less value
			 * Returns the Margin-Plus value
			 */
			function list_less(priceRule, itemId, base_rate_in, trandate,
					amount, pricing_basis_json) {
				var flListLess = '';
				var base_rate = base_rate_in;

				var calc_basis = priceRule.custrecord_nts_pr_calculation_basis;

				if (isEmpty(base_rate)) {
					if (calc_basis == CALC_BASIS.base_price) {
						base_rate = get_base_price(itemId);
					}
					if (calc_basis == CALC_BASIS.average_cost) {
						base_rate = get_average_cost(itemId);
					}
					if (calc_basis == CALC_BASIS.standard_cost) {
						base_rate = get_standard_cost(itemId);
					}
				}

				flListLess = base_rate;

				if ((!isEmpty(priceRule.custrecord_nts_pr_discount_percent))
						&& (!isNaN(parseFloat(priceRule.custrecord_nts_pr_discount_percent)))) {
					var flDiscount = parseFloat(priceRule.custrecord_nts_pr_discount_percent) / 100;
					flListLess = parseFloat(base_rate) * (1 - flDiscount);
				}

				if ((!isEmpty(priceRule.custrecord_nts_pr_discount_amount))
						&& (!isNaN(priceRule.custrecord_nts_pr_discount_amount))) {
					flListLess = parseFloat(flListLess)
							- parseFloat(priceRule.custrecord_nts_pr_discount_amount);
				}

				var calc_details_json = {
					type : 'list_less',
					quantity : '',
					price : flListLess,
					percent : '',
					amount : '',
					promocode : '',
					promoquantity : ''
				};

				if (!isEmpty(trandate)) {
					var alt_pricing_json = handle_alt_price_rule(priceRule,
							itemId, base_rate_in, trandate, amount,
							pricing_basis_json);

					if (!isEmpty(alt_pricing_json)) {
						if (!isEmpty(alt_pricing_json.alt_pricing)) {
							calc_details_json = alt_calc_details(priceRule,
									trandate, base_rate_in, pricing_basis_json,
									itemId, alt_pricing_json, calc_details_json);
						}
					}
				}

				return calc_details_json;
			}

			/**
			 * Queries Price Rule Quantity Tier records using the following:
			 * Price Rule Ordered by starting quantity For each Price Rule
			 * Quantity Tier record, the system performs the following: Checks
			 * if the starting quantity on the quantity tier record is > the
			 * quantity on the line item If so, the system performs the
			 * following: Selects the previous quantity tier record Sets the
			 * Tiered Quantity value to the quantity price on the quantity tier
			 * record Otherwise, the system performs the following: Checks if
			 * the quantity tier record is the last quantity tier record If so,
			 * the system performs the following: Sets the Tiered Quantity value
			 * to the quantity price on the quantity tier record Returns the
			 * Tiered Quantity value
			 */

			function tiered_pricing(price_rule_json, itemId, base_rate_in,
					trandate, amount, pricing_basis_json) {

				var tier_basis = price_rule_json.custrecord_nts_pr_tier_basis;
				var pricing_basis;
				var base_rate = base_rate_in;

				if (tier_basis == TIER_BASIS.quantity) {
					pricing_basis = pricing_basis_json.quantity;
				}
				if (tier_basis == TIER_BASIS.amount) {
					pricing_basis = pricing_basis_json.amount;
				}
				if (tier_basis == TIER_BASIS.weight) {
					pricing_basis = pricing_basis_json.weight;
				}

				var calc_basis = price_rule_json.custrecord_nts_pr_calculation_basis;

				if (isEmpty(base_rate)) {
					if (calc_basis == CALC_BASIS.base_price) {
						base_rate = get_base_price(itemId);
					}
					if (calc_basis == CALC_BASIS.average_cost) {
						base_rate = get_average_cost(itemId);
					}
					if (calc_basis == CALC_BASIS.standard_cost) {
						base_rate = get_standard_cost(itemId);
					}
				}

				var tiered_details;

				if (!isEmpty(trandate)) {
					tiered_details = get_tiered_details(price_rule_json.id,
							pricing_basis);
				} else {
					tiered_details = get_alt_tiered_details(price_rule_json.id,
							pricing_basis);
				}

				var calc_details_json;
				var tier_price;
				var index;

				for (var tier = 0; tier < tiered_details.length; tier++) {

					if (pricing_basis >= tiered_details[tier].tierqty) {

						index = tier;
					}
				}

				if (!isEmpty(index)) {
					calc_details_json = {
						type : 'tiered_pricing',
						quantity : tiered_details[index].tierqty,
						price : tiered_details[index].price,
						percent : tiered_details[index].percent,
						amount : tiered_details[index].amount,
						promocode : '',
						promoquantity : ''
					};

					if (!isEmpty(calc_details_json.price)) {
						tier_price = calc_details_json.price;
					}
					if (!isEmpty(calc_details_json.percent)) {

						var discount = parseFloat(calc_details_json.percent) / 100;
						tier_price = parseFloat(base_rate) * (1 - discount);

					}
					if ((!isEmpty(calc_details_json.amount))
							&& (!isNaN(calc_details_json.amount))) {
						tier_price = parseFloat(base_rate)
								- parseFloat(calc_details_json.amount);
					}

					calc_details_json.price = tier_price;
				}

				if (!isEmpty(trandate)) {
					var alt_pricing_json = handle_alt_price_rule(
							price_rule_json, itemId, base_rate_in, trandate,
							amount, pricing_basis_json);

					if (!isEmpty(alt_pricing_json)) {
						if (!isEmpty(alt_pricing_json.alt_pricing)) {
							calc_details_json = alt_calc_details(
									price_rule_json, trandate, base_rate_in,
									pricing_basis_json, itemId,
									alt_pricing_json, calc_details_json);
						}
					}
				}

				return calc_details_json;
			}

			function get_tiered_details(intPriceRuleId) {

				var tierQtySearchObj = search.create({
					type : "customrecord_nts_price_rule_qty_tier",
					filters : [ [ "custrecord_nts_prqt_price_rule.internalid",
							"anyof", intPriceRuleId ] ],
					columns : [ "name", "internalid",
							"custrecord_nts_prqt_price_rule",
							search.createColumn({
								name : "custrecord_nts_prqt_starting_quantity",
								sort : search.Sort.ASC
							}), "custrecord_nts_prqt_qty_price",
							'custrecord_nts_pr_tier_percent',
							'custrecord_nts_pr_tier_amount' ]
				});

				var searchResults = results(tierQtySearchObj)

				var arrTierQty = [];
				for (var i = 0; i < searchResults.length; i++) {

					var objQtyTier = {};
					objQtyTier.internalid = searchResults[i]
							.getValue('internalid');
					objQtyTier.pricerule = searchResults[i]
							.getValue('custrecord_nts_prqt_price_rule');
					objQtyTier.tierqty = searchResults[i]
							.getValue('custrecord_nts_prqt_starting_quantity');
					objQtyTier.price = searchResults[i]
							.getValue('custrecord_nts_prqt_qty_price');
					objQtyTier.percent = searchResults[i]
							.getValue('custrecord_nts_pr_tier_percent');
					objQtyTier.amount = searchResults[i]
							.getValue('custrecord_nts_pr_tier_amount');

					arrTierQty.push(objQtyTier);
				}

				return arrTierQty;
			}

			function get_alt_tiered_details(intPriceRuleId) {

				var tierQtySearchObj = search.create({
					type : "customrecord_nts_alt_price_rule_tier",
					filters : [ [ "custrecord_nts_alt_price_rule.internalid",
							"anyof", intPriceRuleId ] ],
					columns : [ "name", "internalid",
							"custrecord_nts_alt_price_rule",
							search.createColumn({
								name : "custrecord_nts_alt_pr_starting_tier",
								sort : search.Sort.ASC
							}), "custrecord_nts_alt_pr_tier_price",
							'custrecord_nts_alt_pr_tier_percent',
							'custrecord_nts_alt_pr_tier_amount' ]
				});

				var searchResults = results(tierQtySearchObj)

				var arrTierQty = [];
				for (var i = 0; i < searchResults.length; i++) {

					var objQtyTier = {};
					objQtyTier.internalid = searchResults[i]
							.getValue('internalid');
					objQtyTier.pricerule = searchResults[i]
							.getValue('custrecord_nts_alt_price_rule');
					objQtyTier.tierqty = searchResults[i]
							.getValue('custrecord_nts_alt_pr_starting_tier');
					objQtyTier.price = searchResults[i]
							.getValue('custrecord_nts_alt_pr_tier_price');
					objQtyTier.percent = searchResults[i]
							.getValue('custrecord_nts_alt_pr_tier_percent');
					objQtyTier.amount = searchResults[i]
							.getValue('custrecord_nts_alt_pr_tier_amount');

					arrTierQty.push(objQtyTier);
				}

				return arrTierQty;
			}

			function promotion(priceRule, pricing_basis_json, itemId,
					base_rate_in, trandate, amount) {

				var pricing_basis = pricing_basis_json.quantity;

				var promotion_details = get_promotion_details(priceRule.id,
						pricing_basis);
				var calc_details_json

				if (promotion_details.length > 0) {

					calc_details_json = {
						type : 'promotion_pricing',
						quantity : '',
						price : amount
								/ (parseInt(pricing_basis) + parseInt(promotion_details[0].promoquantity)),
						percent : '',
						amount : '',
						promocode : promotion_details[0].promocode,
						promoquantity : promotion_details[0].promoquantity
					};

					if (!isEmpty(trandate)) {
						var alt_pricing_json = handle_alt_price_rule(priceRule,
								itemId, base_rate_in, trandate, amount,
								pricing_basis_json);

						if (!isEmpty(alt_pricing_json)) {
							if (!isEmpty(alt_pricing_json.alt_pricing)) {
								calc_details_json = alt_calc_details(priceRule,
										trandate, base_rate_in,
										pricing_basis_json, itemId,
										alt_pricing_json, calc_details_json);
							}
						}
					}
				}

				return calc_details_json;
			}

			function get_promotion_details(price_rule_id, quantity) {
				var tierQtySearchObj = search
						.create({
							type : "customrecord_nts_price_rule_promo",
							filters : [
									[ "custrecord_nts_pr_promo_max_quantity",
											"notlessthan", quantity ],
									"AND",
									[ "custrecord_nts_pr_promo_min_quantity",
											"notgreaterthan", quantity ],
									"AND",
									[
											"custrecord_nts_pr_promo_price_rule.custrecord_nts_pr_calculation_method",
											"anyof", "6" ],
									"AND",
									[
											"custrecord_nts_pr_promo_price_rule.internalid",
											"anyof", price_rule_id ] ],
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

				var searchResults = results(tierQtySearchObj);

				var arrTierQty = [];
				for (var i = 0; i < searchResults.length; i++) {
					var objQtyTier = {};
					objQtyTier.internalid = searchResults[i]
							.getValue('internalid');
					objQtyTier.pricerule = searchResults[i]
							.getValue('custrecord_nts_pr_promo_price_rule');
					objQtyTier.tierqty = searchResults[i]
							.getValue('custrecord_nts_pr_promo_max_quantity');
					objQtyTier.price = searchResults[i]
							.getValue('custrecord_nts_pr_promo_qty_price');
					objQtyTier.promocode = searchResults[i]
							.getValue('custrecord_nts_pr_promo_code');
					objQtyTier.promoquantity = searchResults[i]
							.getValue('custrecord_nts_pr_promo_quantity');

					arrTierQty.push(objQtyTier);
				}
				return arrTierQty;
			}

			function alt_promotion(price_rule_json, item_id, base_rate,
					trandate, amount, pricing_basis_json) {

				var pricing_basis = pricing_basis_json.quantity;

				var promotion_details = get_alt_promotion_details(
						price_rule_json.id, pricing_basis);

				if (promotion_details.length > 0) {
					return {
						quantity : promotion_details[0].tierqty,
						price : promotion_details[0].price,
						promocode : promotion_details[0].promocode,
						promoquantity : promotion_details[0].promoquantity
					}
				} else {
					return;
				}
			}

			function get_alt_promotion_details(price_rule_id, quantity) {

				var tierQtySearchObj = search.create({
					type : "customrecord_nts_alt_price_rule_promo",
					filters : [
							[ "custrecord_nts_alt_pr_promo_max_quantity",
									"notlessthan", quantity ],
							"AND",
							[ "custrecord_nts_alt_pr_promo_min_quantity",
									"notgreaterthan", quantity ],
							"AND",
							[ "custrecord_nts_alt_pr_promo_price_rule",
									"anyof", price_rule_id ] ],
					columns : [ search.createColumn({
						name : "name",
						sort : search.Sort.ASC,
						label : "Name"
					}), search.createColumn({
						name : "scriptid",
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_promo_price_rule",
						label : "Price Rule"
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

				var searchResults = results(tierQtySearchObj);

				var arrTierQty = [];
				for (var i = 0; i < searchResults.length; i++) {
					var objQtyTier = {};
					objQtyTier.internalid = searchResults[i]
							.getValue('internalid');
					objQtyTier.pricerule = searchResults[i]
							.getValue('custrecord_nts_alt_pr_promo_price_rule');
					objQtyTier.tierqty = searchResults[i]
							.getValue('custrecord_nts_alt_pr_promo_max_quantity');
					objQtyTier.promocode = searchResults[i]
							.getValue('custrecord_nts_alt_pr_promo_code');
					objQtyTier.promoquantity = searchResults[i]
							.getValue('custrecord_nts_alt_pr_promo_quantity');

					arrTierQty.push(objQtyTier);
				}
				return arrTierQty;
			}

			function alt_calc_details(priceRule, trandate, base_rate_in,
					pricing_basis_json, itemId, alt_pricing_json,
					calc_details_json) {

				var alt_pricing = alt_pricing_json.alt_pricing;

				switch (alt_pricing_json.pricing) {
				case 'promotion_pricing_json':
					var quantity = parseInt(alt_pricing.promoquantity)
							+ parseInt(pricing_basis_json.quantity);
					var promo_price = parseFloat(pricing_basis_json.amount)
							/ parseInt(quantity);

					if (calc_details_json.price > promo_price) {
						calc_details_json = {
							type : 'promotion_pricing',
							quantity : '',
							price : promo_price,
							percent : '',
							amount : '',
							promocode : alt_pricing.promocode,
							promoquantity : alt_pricing.promoquantity
						};

					}
					break;
				case 'tiered_pricing_json':
					if (calc_details_json.price > alt_pricing.price) {
						calc_details_json = {
							type : 'tiered_pricing',
							quantity : pricing_basis_json.quantity,
							price : alt_pricing.price,
							percent : '',
							amount : '',
							promocode : '',
							promoquantity : ''
						};
					}
					break;
				case 'fixed_price':
					if (calc_details_json.price > alt_pricing.price) {
						calc_details_json = {
							type : 'fixed_price',
							quantity : '',
							price : alt_pricing.price,
							percent : '',
							amount : '',
							promocode : '',
							promoquantity : ''
						};
					}
					break;
				case 'markup_price':
					if (calc_details_json.price > alt_pricing.price) {
						calc_details_json = {
							type : 'markup_price',
							quantity : '',
							price : alt_pricing.price,
							percent : '',
							amount : '',
							promocode : '',
							promoquantity : ''
						};
					}
					break;
				case 'margin_price':
					if (calc_details_json.price > alt_pricing.price) {
						calc_details_json = {
							type : 'margin_price',
							quantity : '',
							price : alt_pricing.price,
							percent : '',
							amount : '',
							promocode : '',
							promoquantity : ''
						};
					}
					break;
				case 'list_less_price':
					if (calc_details_json.price > alt_pricing.price) {
						calc_details_json = {
							type : 'list_less_price',
							quantity : '',
							price : alt_pricing.price,
							percent : '',
							amount : '',
							promocode : '',
							promoquantity : ''
						};
					}
					break;
				}

				return calc_details_json;
			}

			function handle_alt_price_rule(price_rule, item_id, base_rate,
					trandate, amount, pricing_basis_json) {

				var alt_price_rule = get_alt_price_rule(price_rule.id, trandate);
				var alt_pricing_json;

				if (!isEmpty(alt_price_rule)) {
					alt_pricing_json = alt_item_pricing(alt_price_rule,
							base_rate, item_id, '', pricing_basis_json, amount)
				}

				return alt_pricing_json;

			}

			function alt_item_pricing(alt_price_rule, base_rate, item_id,
					trandate, pricing_basis_json, amount) {

				var calc_method = alt_price_rule.getValue({
					name : 'custrecord_nts_alt_pr_calculation_method'
				});

				var tier_basis = alt_price_rule.getValue({
					name : 'custrecord_nts_alt_pr_tier_basis'
				});

				var price_rule_json = {
					custrecord_nts_pr_markup_percent : alt_price_rule
							.getValue({
								name : 'custrecord_nts_alt_pr_markup_percent'
							}),
					custrecord_nts_pr_markup_amount : alt_price_rule.getValue({
						name : 'custrecord_nts_alt_pr_markup_amount'
					}),
					custrecord_nts_pr_fixed_price : alt_price_rule.getValue({
						name : 'custrecord_nts_alt_pr_fixed_price'
					}),
					custrecord_nts_pr_margin_percent : alt_price_rule
							.getValue({
								name : 'custrecord_nts_alt_pr_margin_percent'
							}),
					custrecord_nts_pr_discount_percent : alt_price_rule
							.getValue({
								name : 'custrecord_nts_alt_pr_discount_percent'
							}),
					custrecord_nts_pr_discount_amount : alt_price_rule
							.getValue({
								name : 'custrecord_nts_alt_pr_discount_amount'
							}),
					custrecord_nts_pr_calculation_basis : alt_price_rule
							.getValue({
								name : 'custrecord_nts_alt_pr_calculation_basis'
							}),
					custrecord_nts_pr_tier_basis : alt_price_rule.getValue({
						name : 'custrecord_nts_alt_pr_tier_basis'
					})
				};

				price_rule_json.id = alt_price_rule.id;

				var alt_pricing;
				var pricing;

				if (calc_method == CALC_METHOD.promotion) {
					alt_pricing = alt_promotion(price_rule_json, item_id,
							base_rate, trandate, amount, pricing_basis_json);
					pricing = 'promotion_pricing_json';
				}

				if (calc_method == CALC_METHOD.tiered_pricing) {
					alt_pricing = tiered_pricing(price_rule_json, item_id,
							base_rate, trandate, amount, pricing_basis_json);
					pricing = 'tiered_pricing_json';
				}

				if (calc_method == CALC_METHOD.fixed_price) {
					alt_pricing = fixed_price(price_rule_json, item_id,
							base_rate, trandate, amount, pricing_basis_json);
					pricing = 'fixed_price';
				}
				if (calc_method == CALC_METHOD.markup) {
					alt_pricing = cost_plus(price_rule_json, item_id,
							base_rate, trandate, amount, pricing_basis_json);
					pricing = 'markup_price';
				}
				if (calc_method == CALC_METHOD.margin_plus) {
					alt_pricing = margin_plus(price_rule_json, item_id,
							base_rate, trandate, amount, pricing_basis_json);
					pricing = 'margin_price';
				}
				if (calc_method == CALC_METHOD.list_less) {
					alt_pricing = list_less(price_rule_json, item_id,
							base_rate, trandate, amount, pricing_basis_json);
					pricing = 'list_less_price';
				}

				return {
					pricing : pricing,
					alt_pricing : alt_pricing
				}
			}

			function get_base_price(intItem) {
				var base_price = 0;
				var itemSearchObj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", intItem ], "AND",
							[ "pricing.pricelevel", "anyof", "1" ] ],
					columns : [ search.createColumn({
						name : "unitprice",
						join : "pricing"
					}) ]
				});
				var searchObj = itemSearchObj.run().getRange(0, 1);

				if (searchObj.length > 0) {
					base_price = searchObj[0].getValue({
						name : "unitprice",
						join : "pricing"
					}) || 0;
				}
				return base_price;
			}

			function get_last_purchase_price(intItem) {
				var lastpurchaseprice = 0;
				var itemSearchObj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", intItem ] ],
					columns : [ "lastpurchaseprice" ]
				});
				var searchObj = itemSearchObj.run().getRange(0, 1);

				if (searchObj.length > 0) {
					lastpurchaseprice = searchObj[0].getValue({
						name : "lastpurchaseprice"
					}) || 0;
				}

				return lastpurchaseprice;
			}

			function get_average_cost(intItem) {
				var averagecost = 0;
				var itemSearchObj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", intItem ], "AND",
							[ "pricing.pricelevel", "anyof", "1" ] ],
					columns : [ search.createColumn({
						name : "averagecost"
					}) ]
				});
				var searchObj = itemSearchObj.run().getRange(0, 1);

				if (searchObj.length > 0) {
					averagecost = searchObj[0].getValue({
						name : "averagecost",
					}) || 0;
				}

				return averagecost;
			}

			function get_standard_cost(intItem) {
				var currentstandardcost = 0;
				var itemSearchObj = search.create({
					type : "item",
					filters : [ [ "internalid", "anyof", intItem ], "AND",
							[ "pricing.pricelevel", "anyof", "1" ] ],
					columns : [ search.createColumn({
						name : "currentstandardcost"
					}) ]
				});
				var searchObj = itemSearchObj.run().getRange(0, 1);

				if (searchObj.length > 0) {
					currentstandardcost = searchObj[0].getValue({
						name : "currentstandardcost",
					}) || 0;
				}

				return currentstandardcost;
			}

			function get_price_rule(intCustomerId, stDate, intItemId) {

				var customerFilter = [ "custrecord_nts_pr_customer", "anyof",
						intCustomerId ];

				var itemFilter = [ "custrecord_nts_pr_item", "anyof", intItemId ];

				var objPriceRuleSearchObj = search
						.create({
							type : 'customrecord_nts_price_rule',
							filters : [
									[ customerFilter ],
									"AND",
									[ itemFilter ],
									"AND",
									[ "isinactive", "is", "F" ],
									"AND",
									[ "custrecord_nts_pr_start_date",
											"onorbefore", stDate ],
									"AND",
									[
											[ "custrecord_nts_pr_end_date",
													"onorafter", "today" ],
											"OR",
											[ "custrecord_nts_pr_end_date",
													"isempty", "" ] ] ],
							columns : [
									search
											.createColumn({
												name : "formulanumeric",
												formula : "case  when {custrecord_nts_pr_type}='Contract' then 0 when {custrecord_nts_pr_type}='Affiliation' then 1 when {custrecord_nts_pr_type}='Across the Board' then  {custrecord_nts_pr_priority} + 1 else 0 end",
												sort : search.Sort.ASC,
												label : "Sort By"
											}), "custrecord_nts_pr_type",
									"custrecord_nts_pr_type", "internalid",
									"custrecord_nts_pr_calculation_method",
									"custrecord_nts_pr_calculation_basis",
									"custrecord_nts_pr_customer",
									"custrecord_nts_pr_item",
									"custrecord_nts_pr_fixed_price",
									"custrecord_nts_pr_end_date",
									"custrecord_nts_pr_start_date",
									"custrecord_nts_pr_discount_percent",
									"custrecord_nts_pr_discount_amount",
									"custrecord_nts_pr_markup_amount",
									"custrecord_nts_pr_markup_percent",
									"custrecord_nts_pr_margin_percent",
									'custrecord_nts_pr_tier_basis' ]
						});

				var searchObj = objPriceRuleSearchObj.run().getRange(0, 1);
				var objPriceResult;

				if (searchObj.length > 0) {
					objPriceResult = searchObj[0];
				}

				return objPriceResult;
			}

			function get_alt_price_rule(price_rule_id, effective_date) {
				var search_results;
				var search_result;
				var search_obj = search.create({
					type : "customrecord_nts_alt_price_rule",
					filters : [
							[ "custrecord_nts_alt_pr_price_rule.internalid",
									"anyof", price_rule_id ],
							"AND",
							[ "custrecord_nts_alt_pr_start_date", "onorbefore",
									effective_date ],
							"AND",
							[ "custrecord_nts_alt_pr_end_date", "onorafter",
									effective_date ], "AND",
							[ "isinactive", "is", "F" ] ],
					columns : [ search.createColumn({
						name : "scriptid",
						sort : search.Sort.ASC,
						label : "Script ID"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_start_date",
						label : "Start Date"
					}), search.createColumn({
						name : "custrecord_nts_alt_pr_end_date",
						label : "End Date"
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

				search_results = results(search_obj);
				if (search_results.length > 0) {
					search_result = search_results[0];
				}

				return search_result;
			}

			function find_price_rule(intCustomerId, intItemId) {

				var customerFilter = [ "custrecord_nts_pr_customer", "anyof",
						intCustomerId ];

				var itemFilter = [ "custrecord_nts_pr_item", "anyof", intItemId ];

				var objPriceRuleSearchObj = search
						.create({
							type : 'customrecord_nts_price_rule',
							filters : [ [ customerFilter ], "AND",
									[ itemFilter ], "AND",
									[ "isinactive", "is", "F" ], ],
							columns : [
									search
											.createColumn({
												name : "formulanumeric",
												formula : "case  when {custrecord_nts_pr_type}='Contract' then 0 when {custrecord_nts_pr_type}='Affiliation' then 1 when {custrecord_nts_pr_type}='Across the Board' then  {custrecord_nts_pr_priority} + 1 else 0 end",
												sort : search.Sort.ASC,
												label : "Sort By"
											}), "custrecord_nts_pr_type",
									"custrecord_nts_pr_type", "internalid",
									"custrecord_nts_pr_calculation_method",
									"custrecord_nts_pr_calculation_basis",
									"custrecord_nts_pr_customer",
									"custrecord_nts_pr_item",
									"custrecord_nts_pr_fixed_price",
									"custrecord_nts_pr_end_date",
									"custrecord_nts_pr_start_date",
									"custrecord_nts_pr_discount_percent",
									"custrecord_nts_pr_discount_amount",
									"custrecord_nts_pr_markup_amount",
									"custrecord_nts_pr_markup_percent",
									"custrecord_nts_pr_margin_percent",
									'custrecord_nts_pr_tier_basis' ]
						});

				var searchObj = objPriceRuleSearchObj.run().getRange(0, 1);
				var objPriceResult;

				if (searchObj.length > 0) {
					objPriceResult = searchObj[0];
				}

				return objPriceResult;
			}

			function isEmpty(stValue) {
				return ((stValue === '' || stValue == null || stValue == undefined)
						|| (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(
						v) {
					for ( var k in v)
						return false;
					return true;
				})(stValue)));
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

			function results_ranged(search_obj, start, end) {
				var results_array = [];

				results_array = search_obj.run().getRange({
					start : start,
					end : end
				});

				return results_array;
			}

			return {
				fixed_price : fixed_price,
				cost_plus : cost_plus,
				margin_plus : margin_plus,
				list_less : list_less,
				tiered_pricing : tiered_pricing,
				promotion : promotion,
				get_price_rule : get_price_rule,
				find_price_rule : find_price_rule,
				alt_item_pricing : alt_item_pricing,
				get_alt_price_rule : get_alt_price_rule
			};

		});
