/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([ 'N/record', 'N/runtime', 'N/search', ],

function(record, runtime, search, nts_md_manage_price_rule) {

	function beforeLoad(scriptContext) {

	}

	function beforeSubmit(scriptContext) {

	}

	function afterSubmit(scriptContext) {
		try {
			if (scriptContext.type != scriptContext.UserEventType.DELETE) {
				threshold_pricing_realtime(scriptContext);
			}
		} catch (e) {
			log.error(e.name, 'msg: ' + e.message + ' stack: ' + e.stack);
		}
	}

	/**
	 * This process is used to apply discounts to non-promotional items on a
	 * sales order when the quantity reaches a predefined threshold
	 * 
	 * The process starts when the user elects to save a sales order
	 * 
	 * The system performs the following: � Loads the sales order � For each
	 * sales order line item, the system performs the following: o Checks if the
	 * line item promo code has a value o If not, the system performs the
	 * following: Sums the line item quantity Records the line item � Checks if
	 * the summed line item quantity is >= to the quantity threshold as follows:
	 * o Queries discount threshold records using the following: Summed line
	 * item quantity o If the result length > 0, the system performs the
	 * following: o Determine the recorded line item with the lowest rate o Adds
	 * the discount threshold record quantity to the lowest rate line item
	 * quantity o Calculates the rate of the lowest rate line item as follows:
	 * Amount/quantity = rate o Sets the lowest rate line item rate to the
	 * calculated rate o Sets the lowest rate line item promo code to the
	 * discount threshold record promo code o Saves the sales order
	 * 
	 * The process ends
	 * 
	 * 
	 */
	function threshold_pricing_realtime(scriptContext) {
		var sales_order = record.load({
			type : record.Type.SALES_ORDER,
			id : scriptContext.newRecord.id,
			isDynamic : false
		});
		var line_count = sales_order.getLineCount({
			sublistId : 'item'
		});
		var promo_code;
		var quantity;
		var amount;
		var total_so_qty = 0;
		var items = [];
		var item;
		var lowest_rate_item;
		var lowest_rate_line
		var lowest_rate_quantity;
		var lowest_rate_amount;
		var rate;
		var rate_cb;
		var discount_threshhold;

		for (var i = 0; i < line_count; i++) {
			promo_code = sales_order.getSublistValue({
				sublistId : 'item',
				fieldId : 'custcol_nts_so_promo_code',
				line : i
			});

			quantity = sales_order.getSublistValue({
				sublistId : 'item',
				fieldId : 'quantity',
				line : i
			}) || 0;

			item = sales_order.getSublistValue({
				sublistId : 'item',
				fieldId : 'item',
				line : i
			});

			rate = sales_order.getSublistValue({
				sublistId : 'item',
				fieldId : 'rate',
				line : i
			}) || 0;

			amount = sales_order.getSublistValue({
				sublistId : 'item',
				fieldId : 'amount',
				line : i
			}) || 0;

			if (isEmpty(promo_code)) {
				total_so_qty = parseFloat(total_so_qty) + parseInt(quantity);
				if (isEmpty(rate_cb)) {
					lowest_rate_item = item;
					lowest_rate_line = i;
					lowest_rate_quantity = quantity;
					lowest_rate_amount = amount;
					rate_cb = rate;
				} else if (rate < rate_cb) {
					lowest_rate_item = item;
					lowest_rate_line = i;
					lowest_rate_quantity = quantity;
					lowest_rate_amount = amount;
					rate_cb = rate;
				}
			}
		}

		discount_threshhold = discount_threshold_search(total_so_qty);

		if (!isEmpty(discount_threshhold)) {

			var discount = discount_threshhold.getValue({
				name : 'custrecord_nts_dt_discount'
			});

			quantity = parseInt(lowest_rate_quantity) + parseInt(discount);
			rate = lowest_rate_amount / quantity;

			sales_order.setSublistValue({
				sublistId : 'item',
				fieldId : 'quantity',
				line : lowest_rate_line,
				value : quantity
			});

			sales_order.setSublistValue({
				sublistId : 'item',
				fieldId : 'rate',
				line : lowest_rate_line,
				value : rate
			});

			sales_order.setSublistValue({
				sublistId : 'item',
				fieldId : 'custcol_nts_so_promo_code',
				line : lowest_rate_line,
				value : discount_threshhold.getValue({
					name : 'custrecord_nts_dt_promo_code'
				})
			});

			sales_order.setSublistValue({
				sublistId : 'item',
				fieldId : 'price',
				line : lowest_rate_line,
				value : -1
			});

			sales_order.save();
		}

	}

	function discount_threshold_search(total_so_qty) {
		var discount_threshold;
		var discount_threshold_results;
		var search_obj = search.create({
			type : "customrecord_nts_so_discount_threshold",
			filters : [
					[ "custrecord_nts_dt_threshold_min", "lessthanorequalto",
							total_so_qty ],
					"AND",
					[ "custrecord_nts_dt_threshold_max",
							"greaterthanorequalto", total_so_qty ] ],
			columns : [ search.createColumn({
				name : "name",
				sort : search.Sort.ASC,
				label : "Name"
			}), search.createColumn({
				name : "scriptid",
				label : "Script ID"
			}), search.createColumn({
				name : "custrecord_nts_dt_promo_code",
				label : "Promo Code"
			}), search.createColumn({
				name : "custrecord_nts_dt_discount",
				label : "Discount"
			}), search.createColumn({
				name : "custrecord_nts_dt_threshold_min",
				label : "Threshold Min"
			}), search.createColumn({
				name : "custrecord_nts_dt_threshold_max",
				label : "Threshold Max"
			}) ]
		});
		discount_threshold_results = results(search_obj);
		if (discount_threshold_results.length > 0) {
			discount_threshold = discount_threshold_results[0];
		}

		return discount_threshold;
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
		beforeLoad : null,
		beforeSubmit : null,
		afterSubmit : afterSubmit
	};

});
