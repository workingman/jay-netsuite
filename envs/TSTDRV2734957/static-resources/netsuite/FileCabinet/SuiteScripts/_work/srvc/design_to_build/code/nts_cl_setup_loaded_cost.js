/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/error', 'N/record', 'N/runtime', 'N/search', 'N/ui/dialog' ],

		function(error, record, runtime, search, dialog) {

			function pageInit(scriptContext) {

			}

			function fieldChanged(scriptContext) {
			}

			function postSourcing(scriptContext) {

			}

			function sublistChanged(scriptContext) {

			}

			function lineInit(scriptContext) {

			}

			function validateField(scriptContext) {
				var loaded_cost = scriptContext.currentRecord;
				var sales_rep;
				var sales_rep_group

				if (scriptContext.fieldId == 'custrecord_nts_lc_sales_rep') {
					return validate_sales_rep(loaded_cost,
							'custrecord_nts_lc_sales_rep');
				}
				if (scriptContext.fieldId == 'custrecord_nts_lc_sales_rep_group') {
					return validate_sales_rep(loaded_cost,
							'custrecord_nts_lc_sales_rep_group');
				}

				if (scriptContext.fieldId == 'custrecord_nts_lc_customer') {
					return validate_customer(loaded_cost,
							'custrecord_nts_lc_customer');
				}
				if (scriptContext.fieldId == 'custrecord_nts_lc_customer_group') {
					return validate_customer(loaded_cost,
							'custrecord_nts_lc_customer_group');
				}

				if (scriptContext.fieldId == 'custrecord_nts_lc_item_group') {
					return validate_item(loaded_cost,
							'custrecord_nts_lc_item_group');
				}
				if (scriptContext.fieldId == 'custrecord_nts_lc_item_search') {
					return validate_item(loaded_cost,
							'custrecord_nts_lc_item_search');
				}

				return true;
			}

			function validate_sales_rep(loaded_cost, fieldId) {
				var sales_rep;
				var sales_rep_group

				sales_rep = loaded_cost.getValue('custrecord_nts_lc_sales_rep');
				sales_rep_group = loaded_cost
						.getValue('custrecord_nts_lc_sales_rep_group');

				if (!isEmpty(sales_rep) && !isEmpty(sales_rep_group)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either a Sales Rep or Sales Rep Group, not both"
					};

					dialog.alert(options);

					loaded_cost.setValue({
						fieldId : fieldId,
						value : ''
					});
					return false;
				} else
					return true;
			}

			function validate_customer(loaded_cost, fieldId) {
				var customer;
				var customer_group

				customer = loaded_cost.getValue('custrecord_nts_lc_customer');
				customer_group = loaded_cost
						.getValue('custrecord_nts_lc_customer_group');

				if (!isEmpty(customer) && !isEmpty(customer_group)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either a Customer or Customer Group, not both"
					};

					dialog.alert(options);

					loaded_cost.setValue({
						fieldId : fieldId,
						value : ''
					});
					return false;
				} else
					return true;
			}

			function validate_item(loaded_cost, fieldId) {
				var item_group;
				var item_search

				item_group = loaded_cost
						.getValue('custrecord_nts_lc_item_group');
				item_search = loaded_cost
						.getValue('custrecord_nts_lc_item_search');

				if (!isEmpty(item_group) && !isEmpty(item_search)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either an Item Group or Item Search, not both"
					};

					dialog.alert(options);

					loaded_cost.setValue({
						fieldId : fieldId,
						value : ''
					});
					return false;
				} else
					return true;
			}

			function validateLine(scriptContext) {

			}

			function validateInsert(scriptContext) {

			}

			function validateDelete(scriptContext) {

			}

			function saveRecord(scriptContext) {

				return validate_loaded_cost(scriptContext);
			}

			function validate_loaded_cost(scriptContext) {
				var loaded_cost = scriptContext.currentRecord;

				var sales_rep = loaded_cost
						.getValue('custrecord_nts_lc_sales_rep');
				var sales_rep_group = loaded_cost
						.getValue('custrecord_nts_lc_sales_rep_group');

				if (isEmpty(sales_rep) && isEmpty(sales_rep_group)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either a Sales Rep or Sales Rep Group"
					};

					dialog.alert(options);

					return false;
				}

				var customer = loaded_cost
						.getValue('custrecord_nts_lc_customer');
				var customer_group = loaded_cost
						.getValue('custrecord_nts_lc_customer_group');

				if (isEmpty(customer) && isEmpty(customer_group)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either a Customer or Customer Group"
					};

					dialog.alert(options);

					return false;
				}

				var item_group = loaded_cost
						.getValue('custrecord_nts_lc_item_group');
				var item_search = loaded_cost
						.getValue('custrecord_nts_lc_item_search');

				if (isEmpty(item_group) && isEmpty(item_search)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either an Item Group or Item Search"
					};

					dialog.alert(options);

					return false;
				}

				var loaded_cost_pct = loaded_cost
						.getValue('custrecord_nts_lc_cost_pct');

				var loaded_cost_amt = loaded_cost
						.getValue('custrecord_nts_lc_cost_amt');

				if (isEmpty(loaded_cost_pct) && isEmpty(loaded_cost_amt)) {
					var options = {
						title : "Loaded Cost",
						message : "Specify either a Loaded Cost % or Loaded Cost $"
					};

					dialog.alert(options);

					return false;
				}

				return true;
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
				pageInit : null,
				fieldChanged : null,
				postSourcing : null,
				sublistChanged : null,
				lineInit : null,
				validateField : validateField,
				validateLine : null,
				validateInsert : null,
				validateDelete : null,
				saveRecord : saveRecord
			};

		});
