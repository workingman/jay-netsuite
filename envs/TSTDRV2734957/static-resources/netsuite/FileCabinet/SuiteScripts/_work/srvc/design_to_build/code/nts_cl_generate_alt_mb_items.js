/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/record', 'N/runtime', 'N/search', 'N/currentRecord', 'N/ui/dialog' ],

		function(record, runtime, search, currentRecord, dialog) {

			var confirmed = false
			var confirmedSet = false;

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
					var generate = price_rule.getValue({
						fieldId : 'custrecord_nts_pr_alt_generate_mb_items'
					})

					if (generate) {
						if (!confirmedSet) {
							var options = check_generate_params(price_rule);

							if (!isEmpty(options)) {
								dialog.alert(options);
								return false;
							} else {
								confirmedSet = false;
								return true;
							}

						} else {
							confirmedSet = false;
							return confirmed;
						}
					}
					return true;
				} catch (e) {
					log.error(e.name + ' message: ' + e.message, e.stack)
				}

			}

			function check_generate_params(price_rule) {
				var selected_uom = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_selected_uom'
				});
				var specified_threshold = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_specified_threshol'
				});
				var specified_item = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_specified_item'
				});
				var specified_item_group = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_specified_item_gro'
				});
				var specified_item_search = price_rule.getValue({
					fieldId : 'custrecord_nts_alt_pr_specified_item_sea'
				});
				var options;

				if (isEmpty(selected_uom)) {
					options = {
						title : "Generate Min-Basis Items",
						message : "Specify a unit of measure"
					};

					return options;
				}

				if (isEmpty(specified_threshold)) {
					options = {
						title : "Generate Min-Basis Items",
						message : "Specify a threshold"
					};

					return options;
				}

				if ((!isEmpty(specified_item) && !isEmpty(specified_item_group))
						|| (!isEmpty(specified_item) && !isEmpty(specified_item_search))
						|| (!isEmpty(specified_item_group) && !isEmpty(specified_item_search))
						|| (isEmpty(specified_item)
								&& isEmpty(specified_item_group) && isEmpty(specified_item_search))) {
					options = {
						title : "Generate Min-Basis Items",
						message : "Specify either Item, Item Group or Item Search"
					};

					return options;
				}

				return options;
			}

			function item_search(filters) {
				var search_obj = search.create({
					type : "item",
					filters : filters,
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
				pageInit : null,
				fieldChanged : null,
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
