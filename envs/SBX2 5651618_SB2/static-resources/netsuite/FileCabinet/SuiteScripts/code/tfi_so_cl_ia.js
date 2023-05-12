/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define
(
  	['N/record', 
	'N/runtime', 
	'N/search',
	'N/ui/dialog'], 
  
	function(record, runtime, search, dialog) 
	{
		
		var exports = {};
  
		/**
		 * CALLBACK FUNCTIONS
		 */
		 
		function getSearchObject(id)
		{
			var searchObj = search.create({
											   type: "item",
											   filters:
											   [
												  ["transaction.internalidnumber","equalto",id], 
												  "AND", 
												  ["transaction.mainline","is","F"], 
												  "AND", 
												  ["formulanumeric: CASE WHEN {transaction.entity} = {custrecordtfi_ia_item.custrecordtfi_ia_customer}THEN 1ELSE 0 END","equalto","1"], 
												  "AND", 
												  ["formulanumeric: CASE WHEN NVL({custrecordtfi_ia_item.custrecordtfi_ia_age_threshold},0) = 0 THEN 1 WHEN {inventorynumber.custitemnumber_aln_manufactured_date} is not null and NVL(sysdate-{inventorynumber.custitemnumber_aln_manufactured_date},0) < {custrecordtfi_ia_item.custrecordtfi_ia_age_threshold} THEN 1 ELSE 0 END","equalto","1"], 
												  "AND", 
												  ["formulanumeric: CASE WHEN {custrecordtfi_ia_item.custrecordtfi_ia_manufacturer_ctry} is null THEN 1  ELSE 1 END","equalto","1"], 
												  "AND", 
												  ["custrecordtfi_ia_item.internalidnumber","isnotempty",""], 
												  "AND", 
												  ["inventorynumber.quantityavailable","greaterthan","0"]
											   ],
											   columns:
											   [
												  search.createColumn({
													 name: "inventorynumber",
													 join: "inventoryNumber"
												  }),
												  search.createColumn({
													 name: "expirationdate",
													 join: "inventoryNumber",
													 sort: search.Sort.ASC
												  }),
												  search.createColumn({
													 name: "item",
													 join: "inventoryNumber",
													 sort: search.Sort.ASC
												  }),
												  search.createColumn({
													 name: "quantityavailable",
													 join: "inventoryNumber"
												  })
												  
											   ]
											});

			return searchObj;
		}
	
		function pageInit(scriptContext)
		{
			try
			{
	
				var so = scriptContext.currentRecord;
				
				var searchObj = getSearchObject(so.id);
				
				
				var searchResults = searchObj.run().getRange({start: 0, end: 100});
				
				
				
				
				var lineCount 	= so.getLineCount({sublistId: 'item'});
				
				for(var i=0; i < lineCount; i++)
				{
					var iaValue = '';
					
					var item = so.getSublistValue({
													sublistId: 'item',
													fieldId: 'item',
													line: i
												 });
				
					for(var j=0; j < searchResults.length; j++ )
					{
						var result = JSON.parse(JSON.stringify(searchResults[j]));
						
						if (item == result.values['inventoryNumber.item'][0].value)
						{
							iaValue += 'Lot Number: ' + result.values['inventoryNumber.inventorynumber']; 
							iaValue += ' Item: ' 	  + result.values['inventoryNumber.item'][0].text; 
							iaValue += ' Available: ' + result.values['inventoryNumber.quantityavailable']; 
							iaValue += ' Exp Date: '  + result.values['inventoryNumber.expirationdate'];
							iaValue += '\n';
						}
					}
				
					so.selectLine({
								sublistId: 'item',
								line: i
								});

					
					so.setCurrentSublistValue({
										sublistId: 'item',
										//fieldId: 'custcoltfi_so_item_subsitution',
										fieldId: 'custcoltfi_so_item_allocation',
										value: iaValue,
										ignoreFieldChange: true
									});
					so.commitLine({sublistId: 'item'});
				}
			}
			catch (error) 
			{
                log.error(error.name, 'msg: ' + error.message + ' stack: ' + error.stack);
			}
			finally
			{
				log.debug("pageInit", "Complete");
				
			}
			return true;
			
		}
		exports.pageInit = pageInit;
	
		return exports;
	}
);