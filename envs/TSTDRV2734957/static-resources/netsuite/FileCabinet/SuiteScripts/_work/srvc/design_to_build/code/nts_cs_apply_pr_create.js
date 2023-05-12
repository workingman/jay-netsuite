/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search', 'N/ui/dialog', 'N/currentRecord' ],

		function(record, runtime, search, dialog, currentRecord) {

			var APPLICATION = {
				create_on_customers : 1,
				update_on_customers : 2,
				create_deep_copy : 3,
				delete_price_rule_mgmt : 4
			};

			var confirmed = false
			var confirmedSet = false;

			function pageInit(scriptContext) {
				try {
					hide_field(scriptContext, 'customform');
					 show_hide_fields(scriptContext);
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function fieldChanged(scriptContext) {
				try {

					if (scriptContext.fieldId == 'custrecord_nts_price_rule_create_app') {
						show_hide_fields(scriptContext);
					}
				} catch (error) {
					log.error(error.name, 'msg: ' + error.message + ' stack: '
							+ error.stack);
				}
			}

			function show_hide_fields(scriptContext) {
				var price_rule = scriptContext.currentRecord;

				var application = price_rule.getValue({
					fieldId : 'custrecord_nts_price_rule_create_app'
				});

				if (isEmpty(application)) {
					show_field(scriptContext, 'name');
					hide_field(scriptContext, 'custrecord_nts_deep_copy_name');
				} else {

					if (application == APPLICATION.create_deep_copy) {
						price_rule.setValue({
							fieldId : 'custrecord_nts_deep_copy_name',
							value : ''
						})
						hide_field(scriptContext, 'name');
						show_field(scriptContext,
								'custrecord_nts_deep_copy_name');
					}

					if (application == APPLICATION.create_on_customers) {
						show_field(scriptContext, 'name');
						hide_field(scriptContext,
								'custrecord_nts_deep_copy_name');
					}

					if (application == APPLICATION.update_on_customers) {
						show_field(scriptContext, 'name');
						hide_field(scriptContext,
								'custrecord_nts_deep_copy_name');
					}

					if (application == APPLICATION.delete_price_rule_mgmt) {
						show_field(scriptContext, 'name');
						hide_field(scriptContext,
								'custrecord_nts_deep_copy_name');
					}
				}
			}

			function postSourcing(scriptContext) {

			}

			function sublistChanged(scriptContext) {

			}

			function lineInit(scriptContext) {

			}

			function validateField(scriptContext) {

			}

			function validateLine(scriptContext) {

			}

			function validateInsert(scriptContext) {

			}

			function validateDelete(scriptContext) {

			}

			function saveRecord(scriptContext) {

				try {
					var price_rule = scriptContext.currentRecord;

					if (!confirmedSet) {

						var options = check_mandatory_fields(price_rule);
						if (!isEmpty(options)) {
							dialog.alert(options);
							return false;
						} else {
							var application = price_rule
									.getValue({
										fieldId : 'custrecord_nts_price_rule_create_app'
									});

							if (application == APPLICATION.delete_price_rule_mgmt) {
								options = {
									title : "Price Rule Mgmt: Delete",
									message : "Are you sure you want to delete this Price Rule Mgmt record?"
								};

								dialog.confirm(options).then(confirm_delete)
										.catch(cancel_delete);
							} else {
								confirmedSet = false;
								return true;
							}
						}
					} else {
						confirmedSet = false;
						return confirmed;
					}
				} catch (e) {
					log.error(e.name + ' message: ' + e.message, e.stack)
				}

			}

			function confirm_delete(result) {
				confirmed = result;
				confirmedSet = true;

				document.getElementById("btn_multibutton_submitter").click();
			}

			function cancel_delete(reason) {
				return false;
			}

			function check_mandatory_fields(price_rule) {
				var deep_copy_name = price_rule.getValue({
					fieldId : 'custrecord_nts_deep_copy_name'
				});
				var start_date = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_start_date'
				});
				var calc_method = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_calc_method'
				});
				var calc_basis = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_calc_basis'
				});

				var specified_customer = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_customer'
				});

				var specified_affiliation = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_affiliation'
				});
				var specified_customer_search = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_customer_search'
				});

				var specified_item = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_item'
				});

				var specified_item_group = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_item_group'
				});
				var specified_item_search = price_rule.getValue({
					fieldId : 'custrecord_nts_pr_create_item_search'
				});

				var options;

				if ((!isEmpty(specified_customer) && !isEmpty(specified_affiliation))
						|| (!isEmpty(specified_customer) && !isEmpty(specified_customer_search))
						|| (!isEmpty(specified_affiliation) && !isEmpty(specified_customer_search))
						|| (isEmpty(specified_customer)
								&& isEmpty(specified_affiliation) && isEmpty(specified_customer_search))) {
					options = {
						title : "Price Rule Mgmt: Customer(s)",
						message : "Specify either Customer, Affiliation or Customer Search"
					};

					return options;
				}

				if ((!isEmpty(specified_item) && !isEmpty(specified_item_group))
						|| (!isEmpty(specified_item) && !isEmpty(specified_item_search))
						|| (!isEmpty(specified_item_group) && !isEmpty(specified_item_search))
						|| (isEmpty(specified_item)
								&& isEmpty(specified_item_group) && isEmpty(specified_item_search))) {
					options = {
						title : "Price Rule Mgmt: Item(s)",
						message : "Specify either Item, Item Group or Item Search"
					};

					return options;
				}

				var application = price_rule.getValue({
					fieldId : 'custrecord_nts_price_rule_create_app'
				});

				if (!isEmpty(application)) {

					if (application == APPLICATION.create_deep_copy) {
						if (isEmpty(deep_copy_name)) {
							options = {
								title : "Price Rule Mgmt: Deep Copy Name",
								message : "Specify a Deep Copy Name"
							};
							return options;
						}
					}

					if (application == APPLICATION.create_on_customers
							|| application == APPLICATION.create_deep_copy) {

						if (isEmpty(start_date)) {
							options = {
								title : "Price Rule Mgmt: Start Date",
								message : "Specify a Start Date"
							};
							return options;
						}

						if (isEmpty(calc_method)) {
							options = {
								title : "Price Rule Mgmt: Calculation Method",
								message : "Specify a Calculation Method"
							};
							return options;
						}

						if (isEmpty(calc_basis)) {
							options = {
								title : "Price Rule Mgmt: Calculation Basis",
								message : "Specify a Calculation Basis"
							};
							return options;
						}
					}
				}

				return options;
			}

			function show_field(scriptContext, field_id) {
				scriptContext.currentRecord.getField({
					fieldId : field_id
				}).isDisplay = true;
			}

			function hide_field(scriptContext, field_id) {
				scriptContext.currentRecord.getField({
					fieldId : field_id
				}).isDisplay = false;
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
				pageInit : pageInit,
				fieldChanged : fieldChanged,
				postSourcing : null,
				sublistChanged : null,
				lineInit : null,
				validateField : null,
				validateLine : null,
				validateInsert : null,
				validateDelete : null,
				saveRecord : saveRecord
			};

		});
