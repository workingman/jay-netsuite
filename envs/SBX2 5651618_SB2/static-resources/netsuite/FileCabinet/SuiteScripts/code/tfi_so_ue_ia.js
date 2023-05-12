/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define
(
	[
		'N/runtime', 
		'N/record', 
		'N/search'
	],

    function(runtime, record, search) 
	{
		var exports = {};
  
        function beforeLoad(scriptContext) 
		{
			try
			{
				
				
				var so = scriptContext.currentRecord;
				
				/*var so  = record.load({
									type: 		scriptContext.newRecord.type,
									id:   		scriptContext.newRecord.id,
									isDynamic: 	false
									});
				*/
				var lineCount = so.getLineCount({sublistId: 'item'});
				
				log.debug('so.lineCount', lineCount);
				so.setSublistValue
							({
								sublistId: 'item',
								fieldId: 'custcoltfi_so_item_subsitution',
								line: 0,
								value: 'STOCK'
							});
				
				
				var v = so.getSublistValue
							({
								sublistId: 'item',
								fieldId: 'custcoltfi_so_item_subsitution',
								line: 0
							});
				log.debug('so.v', v);
				//so.save();
				
			}
			catch (error) 
			{
                log.error(error.name, 'msg: ' + error.message + ' stack: ' + error.stack);
			}
			finally
			{
				
				log.debug("beforeLoad", "Complete");
			}
			return true;
        }

		exports.beforeLoad = beforeLoad;
		return exports;
    }
);
