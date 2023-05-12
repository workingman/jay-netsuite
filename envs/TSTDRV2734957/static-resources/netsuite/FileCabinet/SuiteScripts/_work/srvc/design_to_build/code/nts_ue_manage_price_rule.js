/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search',
				'SuiteScripts/_work/srvc/design_to_build/code/nts_md_manage_price_rule' ],

		function(record, runtime, search, nts_md_manage_price_rule) {
			var PR_RECORD_ID = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_price_rule_record_id_'
			});
			var CONTRACT = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_initial_price_rule_'
			});
			var BEST_PRICE = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_initial_base_price_rule_'
			});
			var prGlobalPref = runtime.getCurrentScript().getParameter({
				name : 'custscript_nts_pr_ui_processing_mode_'
			});
			var BASE_PRICE_LEVEL = -1;
			var CALC_METHOD = {
				fixed_price : 1,
				markup : 2,
				margin_plus : 3,
				list_less : 4,
				tiered_qty : 5,
				promotion : 6
			};
			var REAL_TIME_PR_PREF = 1;

			function beforeLoad(scriptContext) {

			}

			function beforeSubmit(scriptContext) {

			}

			/**
			 * This process is used to calculate the line item rate using
			 * pricing rules specific to the sales order record�s customer/item.
			 * 
			 * The process starts when the user saves a sales order
			 * 
			 * For each item, the system performs the following: Queries the
			 * price rule records using the following criteria: Customer OR
			 * Customer Group AND Item OR Item Category, Price rule type =
			 * �Contract�, Tran date >= Start Date, Tran date <= End Date,
			 * Ordered by last modified date
			 * 
			 * If a price rule is returned, the system performs the following:
			 * Sets the line item rate using the value returned from one of the
			 * following calculation methods specified on the price rule record:
			 * Fixed Price, Cost Plus, Margin Plus, List Less, Tiered Quantity.
			 * Sets the line item�s price level to �Custom� Otherwise, the
			 * system performs the following: Queries the price rule records
			 * using the following criteria: Customer OR Customer Group AND Item
			 * OR Item Category, Price rule type = �Best Price, Tran date >=
			 * Start Date, Tran date <= End Date, Ordered by price rule record
			 * priority If a price rule is returned, the system performs the
			 * following: Sets the line item rate using the value returned from
			 * one of the following calculation methods specified on the price
			 * rule record with the highest priority: Fixed Price, Cost Plus,
			 * Margin Plus, List Less, Tiered Quantity. Sets the line item�s
			 * price level to �Custom�
			 * 
			 * The system saves the sales order record
			 * 
			 * The process ends
			 */
			function afterSubmit(scriptContext) {
				if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) {
					if (REAL_TIME_PR_PREF == prGlobalPref) {
						item_pricing_realtime(scriptContext);
					}
				}
			}

			function item_pricing_realtime(scriptContext) {
				var objRecord = record.load({
					type : record.Type.SALES_ORDER,
					id : scriptContext.newRecord.id,
					isDynamic : true
				});

				var intCustomerId = objRecord.getValue('entity');
				var stDate = objRecord.getText('trandate');
				var objCategoryLookup = search.lookupFields({
					type : search.Type.CUSTOMER,
					id : intCustomerId,
					columns : [ 'category' ]
				});

				var intCustomerCategory = '';
				if (!isEmpty(objCategoryLookup.category)) {
					intCustomerCategory = objCategoryLookup.category[0].value;
				}

				var intLineItems = objRecord.getLineCount({
					sublistId : 'item'
				});
				var override;
				for (var line = 0; line < intLineItems; line++) {
					override = objRecord.getSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_nts_override_price_rule_cb',
						line : line
					});
					if ((override == false) || (override == 'F')) {
						process_line_item(objRecord, intCustomerId, stDate,
								intCustomerCategory, line);
					}
				}
				objRecord.save();
			}

			function process_line_item(objRecord, intCustomerId, stDate,
					intCustomerCategory, line) {
				var intItemId = objRecord.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : line
				});
				var objItemLookup = search.lookupFields({
					type : search.Type.ITEM,
					id : intItemId,
					columns : [ 'custitem_item_category' ]
				});

				if (!isEmpty(objItemLookup.custitem_item_category)) {
					var intItemCategory = objItemLookup['custitem_item_category'][0].value;
				}

				var objPriceResult = nts_md_manage_price_rule.get_price_rule(
						intCustomerId, stDate, intItemId, intCustomerCategory,
						intItemCategory, CONTRACT, CONTRACT, BEST_PRICE,
						PR_RECORD_ID);

				if (isEmpty(objPriceResult)) {
					objPriceResult = nts_md_manage_price_rule.get_price_rule(
							intCustomerId, stDate, intItemId,
							intCustomerCategory, intItemCategory, BEST_PRICE,
							CONTRACT, BEST_PRICE, PR_RECORD_ID);
				}

				if (!isEmpty(objPriceResult)) {
					objRecord.selectLine({
						sublistId : 'item',
						line : line
					});

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
						flRate = parseFloat(nts_md_manage_price_rule.list_less(
								objPriceResult, intItemId));
					}
					if (objPriceResult.calcmethod == CALC_METHOD.tiered_qty) {
						var intQuantity = objRecord.getSublistValue({
							sublistId : 'item',
							fieldId : 'quantity',
							line : line
						});
						var objTieredDetails = nts_md_manage_price_rule
								.tiered_quantity(objPriceResult, intQuantity);
						flRate = objTieredDetails.price;
					}
					objRecord.setCurrentSublistValue({
						sublistId : 'item',
						fieldId : 'rate',
						value : parseFloat(flRate)
					});
					objRecord.commitLine({
						sublistId : 'item'
					});
				}
			}

			function isEmpty(stValue) {
				return ((stValue === '' || stValue == null || stValue == undefined)
						|| (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(
						v) {
					for ( var k in v) {
						return false;
					}
					return true;
				})(stValue)));
			}

			return {
				beforeLoad : null,
				beforeSubmit : null,
				afterSubmit : afterSubmit
			};

		});
