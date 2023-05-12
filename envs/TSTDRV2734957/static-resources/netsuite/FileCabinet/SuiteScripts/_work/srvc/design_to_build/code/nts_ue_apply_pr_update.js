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
			var price_rule_update_id = scriptContext.newRecord.id;

			var price_rule_update = record.load({
				type : 'customrecord_nts_price_rule_update',
				id : price_rule_update_id
			});

			var update_application = price_rule_update.getValue({
				fieldId : 'custrecord_nts_price_rule_update_app'
			});
			var customer = price_rule_update.getValue({
				fieldId : 'custrecord_nts_pr_update_customer'
			});
			var affiliation = price_rule_update.getValue({
				fieldId : 'custrecord_nts_pr_update_affiliation'
			});
			var customer_search = price_rule_update.getValue({
				fieldId : 'custrecord_nts_pr_update_customer_search'
			});

			var item = price_rule_update.getValue({
				fieldId : 'custrecord_nts_pr_update_item'
			});
			var item_group = price_rule_update.getValue({
				fieldId : 'custrecord_nts_pr_update_item_group'
			});
			var item_search = price_rule_update.getValue({
				fieldId : 'custrecord_nts_pr_update_item_search'
			});

			if (!isEmpty(update_application)) {
				apply_price_rule_update(price_rule_update_id, customer,
						affiliation, customer_search, item, item_group,
						item_search);
			}
		} catch (error) {
			log.error(error.name, 'msg: ' + error.message + ' stack: '
					+ error.stack);
		}

	}

	function apply_price_rule_update(price_rule_update_id, customer,
			affiliation, customer_search, item, item_group, item_search) {

		var customer_method;
		var customer_input;
		var item_method;
		var item_input;

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
				custscript_nts_price_rule_update : price_rule_update_id,
				custscript_nts_update_customer_method : customer_method,
				custscript_nts_update_customer_input : customer_input,
				custscript_nts_update_item_method : item_method,
				custscript_nts_update_item_input : item_input
			}
		});

		scriptTask.scriptId = 'customscript_nts_mr_apply_pr_update';
		scriptTask.deploymentId = 'customdeploy_nts_mr_apply_pr_update';
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
				'scripttype' : 553,
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
