/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule' ],

		function(record, runtime, search, nts_md_manage_price_rule) {
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

			function beforeLoad(scriptContext) {

			}

			function beforeSubmit(scriptContext) {

			}

			/**
			 * Alt: Create/Update Price Rule
			 * 
			 * While adding line items to a sales order, the user elects to
			 * override the custom price
			 * 
			 * For each line item, the user performs the following: � Sets the
			 * line item�s price rule override field to true � Sets the line
			 * item�s rate � Adds/Oks the line item The user saves the sales
			 * order For each line item, the system performs the following: �
			 * Checks if the line item price rule override field is set to true �
			 * If so, the system performs the following: o Checks if a price
			 * rule for the customer item exists o If so, the system performs
			 * the following: Sets the price rule calculation method to Fixed
			 * Price Sets the price rule fixed price field to the line item
			 * rate/price o Otherwise, the system performs the following:
			 * Creates a prices rule Sets the price rule calculation method to
			 * Fixed Price Sets the price rule fixed price field to the line
			 * item rate/price The flow continues at Item Pricing � Real-time
			 * 
			 */
			function afterSubmit(scriptContext) {
				if (scriptContext.type != scriptContext.UserEventType.DELETE) {
					auto_price_rule(scriptContext);
				}
			}

			function auto_price_rule(scriptContext) {
				var sales_order = record.load({
					type : record.Type.SALES_ORDER,
					id : scriptContext.newRecord.id,
					isDynamic : false
				});

				var customer_id = sales_order.getValue('entity');

				var line_count = sales_order.getLineCount({
					sublistId : 'item'
				});
				var create_update_fixed_price;

				var item_id;

				for (var line = 0; line < line_count; line++) {
					create_update_fixed_price = sales_order.getSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_nts_create_update_fixed_price',
						line : line
					});

					if (create_update_fixed_price) {
						process_line_item(sales_order, customer_id, line);
						sales_order.setSublistValue({
							sublistId : 'item',
							fieldId : 'custcol_nts_create_update_fixed_price',
							line : line,
							value : false
						});
					}
				}
				sales_order.save();
			}

			function process_line_item(sales_order, customer_id, line) {

				var price_rule;
				var item_id = sales_order.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : line
				});
				var rate = sales_order.getSublistValue({
					sublistId : 'item',
					fieldId : 'rate',
					line : line
				});

				var price_rule = nts_md_manage_price_rule.find_price_rule(
						customer_id, item_id);

				if (!isEmpty(price_rule)) {
					record
							.submitFields({
								type : 'customrecord_nts_price_rule',
								id : price_rule.id,
								values : {
									custrecord_nts_pr_calculation_method : CALC_METHOD.fixed_price,
									custrecord_nts_pr_fixed_price : rate,
									custrecord_nts_pr_rate : rate

								}
							})
				} else {
					price_rule = record.create({
						type : 'customrecord_nts_price_rule'
					});

					price_rule.setValue('custrecord_nts_pr_customer',
							customer_id);
					price_rule.setValue('custrecord_nts_pr_item', item_id);
					price_rule.setValue('custrecord_nts_pr_type',
							PR_TYPE.contract);
					price_rule.setValue('custrecord_nts_pr_calculation_method',
							CALC_METHOD.fixed_price);
					price_rule.setValue('custrecord_nts_pr_fixed_price', rate);
					price_rule.setValue('custrecord_nts_pr_rate', rate);
					price_rule.setValue('custrecord_nts_pr_start_date',
							new Date());

					price_rule.save();
				}
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
