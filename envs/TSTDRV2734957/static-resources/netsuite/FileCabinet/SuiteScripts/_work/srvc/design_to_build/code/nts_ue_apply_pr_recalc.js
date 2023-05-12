/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([ 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/redirect',
		'N/format' ],

function(record, runtime, search, task, redirect, format) {

	function beforeLoad(scriptContext) {

	}

	function beforeSubmit(scriptContext) {

	}

	function afterSubmit(scriptContext) {
		try {
			var price_rule_recalc_id = scriptContext.newRecord.id;

			var price_rule_recalc = record.load({
				type : 'customrecord_nts_price_rule_recalc',
				id : price_rule_recalc_id
			});

			var recalc_application = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_price_rule_recalc_app'
			});
			var customer = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_pr_recalc_customer'
			});
			var affiliation = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_pr_recalc_affiliation'
			});
			var customer_search = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_pr_recalc_customer_search'
			});

			var item = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_pr_recalc_item'
			});
			var item_group = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_pr_recalc_item_group'
			});
			var item_search = price_rule_recalc.getValue({
				fieldId : 'custrecord_nts_pr_recalc_item_search'
			});

			if (!isEmpty(recalc_application)) {
				apply_price_rule_recalc(price_rule_recalc_id, customer,
						affiliation, customer_search, item, item_group,
						item_search);
			}
		} catch (error) {
			log.error(error.name, 'msg: ' + error.message + ' stack: '
					+ error.stack);
		}

	}

	function apply_price_rule_recalc(price_rule_recalc_id, customer,
			affiliation, customer_search, item, item_group, item_search) {

		var customer_method;
		var customer_input;

		if (!isEmpty(customer)) {
			customer_method = 'customer';
			customer_input = customer;
		}
		if (!isEmpty(affiliation)) {
			customer_method = 'affiliation';
			customer_input = affiliation;
		}
		if (!isEmpty(customer_search)) {
			customer_method = 'customer_search';
			customer_input = customer_search;
		}

		if (!isEmpty(item)) {
			item_method = 'item';
			item_input = item;
		}
		if (!isEmpty(item_group)) {
			item_method = 'item_group';
			item_input = item_group;
		}
		if (!isEmpty(item_search)) {
			item_method = 'item_search';
			item_input = item_search;
		}

		var scriptTask = task.create({
			taskType : task.TaskType.MAP_REDUCE,
			params : {
				custscript_nts_price_rule_recalc : price_rule_recalc_id,
				custscript_nts_recalc_customer_method : customer_method,
				custscript_nts_recalc_customer_input : customer_input,
				custscript_nts_recalc_item_method : item_method,
				custscript_nts_recalc_item_input : item_input
			}
		});

		scriptTask.scriptId = 'customscript_nts_mr_recalc_price_rule';
		scriptTask.deploymentId = 'customdeploy_nts_mr_recalc_price_rule';
		scriptTask.submit();

		redirect.toTaskLink({
			id : 'LIST_MAPREDUCESCRIPTSTATUS',
			parameters : {
				'sortcol' : 'dcreated',
				'sortdir' : 'DESC',
				'datemodi' : 'WITHIN',
				'daterange' : 'TODAY',
				'datefrom' : format.format({
					value : new Date(),
					type : format.Type.DATE
				}),
				'dateto' : format.format({
					value : new Date(),
					type : format.Type.DATE
				}),
				'date' : 'TODAY',
				'scripttype' : 626,
				'primarykey' : ''
			}
		});
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
		beforeSubmit : null,
		afterSubmit : afterSubmit
	};

});
