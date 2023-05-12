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
			var price_rule_copy_id = scriptContext.newRecord.id;

			var price_rule_copy = record.load({
				type : 'customrecord_nts_price_rule_copy',
				id : price_rule_copy_id
			});

			var copy_application = price_rule_copy.getValue({
				fieldId : 'custrecord_nts_pr_copy_application'
			});
			var from_customer = price_rule_copy.getValue({
				fieldId : 'custrecord_nts_pr_copy_from_customer'
			});
			var to_customer = price_rule_copy.getValue({
				fieldId : 'custrecord_nts_pr_copy_to_customer'
			});
			var to_affiliation = price_rule_copy.getValue({
				fieldId : 'custrecord_nts_pr_copy_to_affiliation'
			});
			var to_customer_search = price_rule_copy.getValue({
				fieldId : 'custrecord_nts_pr_copy_customer_search'
			});

			if (!isEmpty(copy_application)) {
				apply_price_rule_copy(from_customer, to_customer,
						to_affiliation, to_customer_search);
			}
		} catch (error) {
			log.error(error.name, 'msg: ' + error.message + ' stack: '
					+ error.stack);
		}

	}

	function apply_price_rule_copy(from_customer, to_customer, to_affiliation,
			to_customer_search) {

		var customer_method;
		var customer_input;

		if (!isEmpty(to_customer)) {
			customer_method = 'to_customer';
			customer_input = to_customer;
		}
		if (!isEmpty(to_affiliation)) {
			customer_method = 'to_affiliation';
			customer_input = to_affiliation;
		}
		if (!isEmpty(to_customer_search)) {
			customer_method = 'to_customer_search';
			customer_input = to_customer_search;
		}

		var scriptTask = task.create({
			taskType : task.TaskType.MAP_REDUCE,
			params : {
				custscript_nts_from_customer : from_customer,
				custscript_nts_customer_method : customer_method,
				custscript_nts_customer_input : customer_input
			}
		});

		scriptTask.scriptId = 'customscript_nts_mr_apply_pr_copy';
		scriptTask.deploymentId = 'customdeploy_nts_mr_apply_pr_copy';
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
				'scripttype' : 1562,
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
