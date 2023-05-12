/**
 * @NApiVersion 2.x
 * @NScriptType clientScript
 * @NModuleScope Public
 *
 * Version    Date          	Author                  Remarks
 * 1.00       31 Mar 2023     Amod Deshpande			Case 5031002
 */

define(['N/search', 'N/currentRecord', 'N/format'], 
function (search, currentrec, format) 
{
	
	function fieldChanged(context)
	{
    	var currentRecord = currentrec.get();
		if(context.fieldId == 'custpage_customer' || context.fieldId == 'custpage_invdate')
		{
			var customer = currentRecord.getValue('custpage_customer');
			if(customer != null && customer != '')
				customer = customer.join(';');
			var invDate = currentRecord.getValue('custpage_invdate');
			if(invDate != null && invDate != '')
				invDate = format.format({value: invDate, type: format.Type.DATE});
			var baseURL = currentRecord.getValue('custpage_url');
	
			var targetURL = baseURL + '&customer=' + customer + '&invDate=' + invDate + '&pg=1';
			
		    setWindowChanged(window, false);
		    window.location = targetURL;
		}	
	}

	function validateField(context)
	{
    	var currentRecord = currentrec.get();
		if(context.sublistId == 'custpage_itemsublist' && context.fieldId == 'custpage_cmrate')
		{
			var amtRemaining = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_invamtremain');
			var cmAmt = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmrate');
			if(cmAmt == null || cmAmt == '')
				return true;
			if(parseFloat(cmAmt) > parseFloat(amtRemaining))
			{
				alert('Rate cannot be greater than Amount Remaining.');
				return false;
			}	
		}	
		return true;
	}

	function validateLine(context)
	{
    	var currentRecord = currentrec.get();
		var selectLine = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_select');
		
		var amtRemaining = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_invamtremain');
		var cmRate = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmrate');
		var cmItem = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmitem');

   		var cmItemDesc = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmitemdesc');
   		var cmSalesRep = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmsalesrep');
   		var cmDept = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmdept');
   		var cmClass = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmclass');
   		var cmMemo = currentRecord.getCurrentSublistValue('custpage_itemsublist', 'custpage_cmmemo');

		if(selectLine == null || selectLine == false)
			return true;
		if(cmItem == 0 )// blank
		{
			alert('Credit Memo Item cannot be blank.');
			return false;
		}	
		if(cmItemDesc == null || cmItemDesc == '')
		{
			alert('Credit Memo - Item Description cannot be blank');
			return false;
		}	
		if(cmRate == null || cmRate == '' || parseFloat(cmRate) == 0)
		{
			alert('Credit Memo - Rate cannot be blank or 0.');
			return false;
		}	
		if(parseFloat(cmRate) > parseFloat(amtRemaining))
		{
			alert('Credit Memo - Rate cannot be greater than Invoice - Amount Remaining.');
			return false;
		}	
		if(cmSalesRep == null || cmSalesRep == '')
		{
			alert('Credit Memo - Sales Rep cannot be blank');
			return false;
		}	
		if(cmDept == null || cmDept == '')
		{
			alert('Credit Memo - Department cannot be blank');
			return false;
		}	
		if(cmClass == null || cmClass == '')
		{
			alert('Credit Memo - Class cannot be blank');
			return false;
		}	
		if(cmMemo == null || cmMemo == '')
		{
			alert('Credit Memo - Memo Main cannot be blank');
			return false;
		}	
      
		return true;
	}

	function saveRecord(context)
	{
    	var currentRecord = currentrec.get();
    	
    	var cmDate = currentRecord.getValue('custpage_cmdate');
    	if(cmDate == null || cmDate == '')
    	{
			alert('Please enter a Credit Memo date.');
			return false;
		}
    	
		var lineCount = currentRecord.getLineCount('custpage_itemsublist');
		var matchFound = false;
		for(var iPos = 0; iPos < lineCount; iPos++)
		{
			if(true === currentRecord.getSublistValue('custpage_itemsublist', 'custpage_select', iPos))
			{
				matchFound = true;
              
                var cmRate = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmrate', iPos);
                var cmItem = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmitem', iPos);

                var cmItemDesc = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmitemdesc', iPos);
                var cmSalesRep = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmsalesrep', iPos);
                var cmDept = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmdept', iPos);
                var cmClass = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmclass', iPos);
                var cmMemo = currentRecord.getSublistValue('custpage_itemsublist', 'custpage_cmmemo', iPos);

                if(selectLine == null || selectLine == false)
                    return true;
                if(cmItem == 0 )// blank
                {
                    alert('Credit Memo Item cannot be blank for line ' + (iPos+1));
                    return false;
                }	
                if(cmItemDesc == null || cmItemDesc == '')
                {
                    alert('Credit Memo - Item Description cannot be blank');
                    return false;
                }	
                if(cmRate == null || cmRate == '' || parseFloat(cmRate) == 0)
                {
                    alert('Credit Memo - Rate cannot be blank or 0.');
                    return false;
                }	
                if(parseFloat(cmRate) > parseFloat(amtRemaining))
                {
                    alert('Credit Memo - Rate cannot be greater than Invoice - Amount Remaining.');
                    return false;
                }	
                if(cmSalesRep == null || cmSalesRep == '')
                {
                    alert('Credit Memo - Sales Rep cannot be blank');
                    return false;
                }	
                if(cmDept == null || cmDept == '')
                {
                    alert('Credit Memo - Department cannot be blank');
                    return false;
                }	
                if(cmClass == null || cmClass == '')
                {
                    alert('Credit Memo - Class cannot be blank');
                    return false;
                }	
                if(cmMemo == null || cmMemo == '')
                {
                    alert('Credit Memo - Memo Main cannot be blank');
                    return false;
                }	

				break;
			}
		}
		if(!matchFound)
		{
			alert('Select at least one invoice to process.');
			return false;
		}
    	return true;
	}
	
  return {
	fieldChanged:fieldChanged,
//	validateField:validateField,
//	validateLine: validateLine,
    saveRecord: saveRecord
  };

});