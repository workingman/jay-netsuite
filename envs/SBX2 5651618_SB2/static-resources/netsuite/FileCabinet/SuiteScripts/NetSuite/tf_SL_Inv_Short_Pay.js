	/**
	 * Module Description
	 * 
	 * Version    Date            Author           		Remarks
	 * 1.00       31 Mar 2023     Amod Deshpande		Case 5031002
	 *
	 */
	/**
	 * @NApiVersion 2.0
	 * @NScriptType Suitelet
	 * @NModuleScope Public
	 */
	
	define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/runtime', 'N/url', 'N/error', './tf_SSv2_Utility_Library.js'],
	function(serverWidget, search, record, runtime, url, error) 
	{
		function customItemDisplay(context)
		{
			log.debug('Checking', 'Inside Suitelet');
		    if (context.request.method === 'GET')
		    {
	     		var page = context.request.parameters.pg;
              	page_DisplayPage(context, page);
	        }
          	else
            {
              	page_ProcessData(context)
            }  
	    }	 
		
	    function page_DisplayPage (context, page)
	    {
	      	var scriptObj = runtime.getCurrentScript();
	      	var scriptPath = scriptObj.getParameter({name: 'custscript_ns_client_script_file_path'});
	      	if(scriptPath == null || scriptPath == '')
	        {
	          	var errorObj = error.create({name: 'User_Defined', message: 'Missing Script Parameter "Client Script File Path"'});
		        throw errorObj.message;
	        }  
	      	var invSearchId = scriptObj.getParameter({name: 'custscript_ns_inv_srch'});
	      	if(invSearchId == null || invSearchId == '')
	        {
	          	var errorObj = error.create({name: 'User_Defined', message: 'Missing Script Parameter "Invoice Search"'});
		        throw errorObj.message;
	        }  
	      	var itemSearchId = scriptObj.getParameter({name: 'custscript_ns_short_pay_item_srch'});
	      	if(itemSearchId == null || itemSearchId == '')
	        {
	          	var errorObj = error.create({name: 'User_Defined', message: 'Missing Script Parameter "Short Pay Item Search"'});
		        throw errorObj.message;
	        }  
	      	var salesRepSearchId = scriptObj.getParameter({name: 'custscript_ns_sales_rep_srch'});
	      	if(salesRepSearchId == null || salesRepSearchId == '')
	        {
	          	var errorObj = error.create({name: 'User_Defined', message: 'Missing Script Parameter "Sales Rep Search"'});
		        throw errorObj.message;
	        }  
			var defAmt = scriptObj.getParameter({name: 'custscript_ns_def_appr_amt'});
	      	if(defAmt == null || defAmt == '')
	        {
	          	var errorObj = error.create({name: 'User_Defined', message: 'Missing Script Parameter "Default Approval Amount"'});
		        throw errorObj.message;
	        }  
          	try
            {  
//	            var invList = getAllRowsFromList(search, invSearchId, null, null);
	            var itemList = getAllRowsFromList(search, itemSearchId, null, null);
	            var salesRepList = getAllRowsFromList(search, salesRepSearchId, null, null);
              
		      	var form = serverWidget.createForm({
		          title: 'Create Short Pay',
		          hideNavBar: false
		        });
	          	form.addSubmitButton('Submit');
		        form.clientScriptModulePath = scriptPath; 
		        
	            var baseUrl = url.resolveScript({
	                scriptId: 'customscript_ns_sl_short_pay',
	                deploymentId: 'customdeploy_ns_sl_short_pay',
	                returnExternalUrl: false
	            });
	
	            var urlFld = form.addField({id: 'custpage_url', type: 'text', label: 'Base Url'}).updateDisplayType({displayType:'hidden'});
	            urlFld.defaultValue = baseUrl;
	            
		        var custFld = form.addField({id: 'custpage_customer', type:"multiselect", label: "Customer", source: 'customer'});
//		        custFld.isMandatory = true;
		        var invDateFld = form.addField({id: 'custpage_invdate', type:"date", label: "Invoice Date"});
		        var cmDateFld = form.addField({id: 'custpage_cmdate', type:"date", label: "Credit Memo Date"});
	   			cmDateFld.defaultValue = new Date();
		        cmDateFld.isMandatory = true;
		        
	   			var itemSublist = form.addSublist({id: 'custpage_itemsublist', type: 'LIST', label: 'Invoice - Credit Memo Details'});
	    		itemSublist = sublist_BuildSublist(itemSublist, itemList, salesRepList);
	    		
	            var filters = [];
	            if(page == '1')
	            {
                    customer = context.request.parameters.customer;
                    var custArr = customer.split(';')
                    invDate = context.request.parameters.invDate;
	
	                custFld.defaultValue = custArr;
	                invDateFld.defaultValue = invDate;
		            if(customer != null && customer != '')
		                filters.push(search.createFilter({name: 'entity', operator: search.Operator.ANYOF, values: custArr}));
		
		          	if(invDate != null && invDate != '')
		                filters.push(search.createFilter({name: 'trandate', operator: search.Operator.ONORBEFORE, values: invDate}));
                  
	    		}
                var invList = getAllRowsFromList(search, invSearchId, filters, null);
              	if(invList == null || invList.length == 0)
                {
                  	log.debug('Checking', 'No Invoice records found to process.');
                  	context.response.writePage(form);
                  	return; 
                }  
                log.debug('Checking', 'invList.length = ' + invList.length);
              	for (var iPos = 0; iPos < invList.length; iPos++)
              	{
                  	itemSublist.setSublistValue({id: 'custpage_invid', line: iPos, value: invList[iPos].id});
                  	itemSublist.setSublistValue({id: 'custpage_invdocno', line: iPos, value: invList[iPos].getValue('tranid')});
                  	itemSublist.setSublistValue({id: 'custpage_invdate', line: iPos, value: invList[iPos].getValue('trandate')});
                  	itemSublist.setSublistValue({id: 'custpage_invcustid', line: iPos, value: invList[iPos].getValue('entity')});
                  	itemSublist.setSublistValue({id: 'custpage_invcustname', line: iPos, value: invList[iPos].getValue({name: 'companyname', join: 'customerMain'})});
                  	itemSublist.setSublistValue({id: 'custpage_invamount', line: iPos, value: invList[iPos].getValue('amount')});
                  	itemSublist.setSublistValue({id: 'custpage_invamtremain', line: iPos, value: invList[iPos].getValue('amountremaining')});
                  	var salesRep = invList[iPos].getValue({name: 'salesrep', join: 'customerMain'});
                  	if(salesRep != null && salesRep != '')
                  		itemSublist.setSublistValue({id: 'custpage_invsalesrep', line: iPos, value: salesRep});
                }
              
		        context.response.writePage(form);  
            }
          	catch(ex)
            {
              	log.debug('Error', ex.toString());
            }  
	    }
	
	    function page_ProcessData (context)
	    {
	      	var scriptObj = runtime.getCurrentScript();
			var defAmt = scriptObj.getParameter({name: 'custscript_ns_def_appr_amt'});
			var count = context.request.getLineCount('custpage_itemsublist');
			for (var iPos = 0; iPos < count; iPos++)
			{
				try
				{
// create credit memo               
                  	var select = context.request.getSublistValue('custpage_itemsublist', 'custpage_select', iPos);
                  	if(select == null || select == false)
                      	continue;
                  	var invId = context.request.getSublistValue('custpage_itemsublist', 'custpage_invid', iPos);
					var cmRec = record.transform({fromType: 'invoice', fromId: invId, toType: 'creditmemo', isDynamic: true});
                  	for(var jPos = 0; jPos < cmRec.getLineCount('item'); jPos++)
                    {
                      	cmRec.removeLineItem('item', jPos);
                      	jPos--;
                    }  
                  	cmRec.selectNewLine('item');
					cmRec.setCurrentSublistValue('item', 'item', context.request.getSublistValue('custpage_itemsublist', 'custpage_cmitem', iPos));
					cmRec.setCurrentSublistValue('item', 'description', context.request.getSublistValue('custpage_itemsublist', 'custpage_cmitemdesc', iPos));
                  	var rate = context.request.getSublistValue('custpage_itemsublist', 'custpage_cmrate', iPos);
					cmRec.setCurrentSublistValue('item', 'rate', parseFloat(rate));
					cmRec.setCurrentSublistValue('item', 'department', context.request.getSublistValue('custpage_itemsublist', 'custpage_cmdept', iPos));
					cmRec.setCurrentSublistValue('item', 'class', context.request.getSublistValue('custpage_itemsublist', 'custpage_cmclass', iPos));
                  	cmRec.commitLine('item');
                  
                  	cmRec.setValue('memo', context.request.getSublistValue('custpage_itemsublist', 'custpage_cmmemo', iPos));
//                  	if(parseFloat(rate) <= defAmt)
//                      cmRec.setValue('status', 1);//Approved
                  
                  	for(var jPos = 0; jPos < cmRec.getLineCount('apply'); jPos++)
                    {
                      	var applyInvId = cmRec.getSublistValue('apply', 'internalid', jPos);
                      	if(invId == applyInvId)
                        {  
                          	cmRec.setCurrentSublistValue('apply', 'amount', parseFloat(rate));
                          	break;
                        }  
                    }  
                  	var cmId = cmRec.save(true);
                  	log.debug('Checking', 'Credit Memo created id = ' + cmId);
				}
				catch(ex)
				{
					log.debug('Error', ex.toString());
				}
			}
		
         	var form = serverWidget.createForm({
	          title: 'Create Short Pay',
	          hideNavBar: false
	        });
          
          	form.addField({id: 'custpage_msg', type: 'label', label: 'Short Pay Credit Memos have been created.'});
    		form.addButton({id: 'custpage_ok', label: 'Ok', functionName: 'window.open("/app/center/card.nl?sc=-29&whence=", "_self");'});


	        context.response.writePage(form);  
        }	    
        
	    function sublist_BuildSublist(itemSublist, itemList, salesRepList)
	    {
// set up sublist          
        	var subFld = itemSublist.addField({id: 'custpage_select', type: "checkbox", label: "Select"});
        	var subFld = itemSublist.addField({id: 'custpage_invid', type: "text", label: "Invoice Internalid"}).updateDisplayType({displayType:'hidden'});
        	var subFld = itemSublist.addField({id: 'custpage_invdocno', type: "text", label: "Invoice Number"}).updateDisplayType({displayType:'disabled'});
        	var subFld = itemSublist.addField({id: 'custpage_invdate', type: "date", label: "Invoice Date"}).updateDisplayType({displayType:'disabled'});
        	
        	var subFld = itemSublist.addField({id: 'custpage_invcustid', type: "select", label: "Invoice Customer Id", source: 'customer'}).updateDisplayType({displayType:'disabled'});
        	var subFld = itemSublist.addField({id: 'custpage_invcustname', type: "text", label: "Customer Name"}).updateDisplayType({displayType:'disabled'});
        	var subFld = itemSublist.addField({id: 'custpage_invamount', type: "currency", label: "Invoice Amount"}).updateDisplayType({displayType:'disabled'});
        	var subFld = itemSublist.addField({id: 'custpage_invamtremain', type: "currency", label: "Invoice Amount Remaining"}).updateDisplayType({displayType:'disabled'});
        	var subFld = itemSublist.addField({id: 'custpage_invsalesrep', type: "select", label: "Customer > Sales Rep", source: 'employee'}).updateDisplayType({displayType:'disabled'});

        	var subFld = itemSublist.addField({id: 'custpage_cmitem', type: "select", label: "Credit Memo > Item"});
          	subFld.addSelectOption({value: 0, text: ''});
          	for(var iPos = 0; iPos < itemList.length; iPos++)
            {
              	subFld.addSelectOption({value: itemList[iPos].id, text: itemList[iPos].getValue('itemid')});
            }  
        	var subFld = itemSublist.addField({id: 'custpage_cmitemdesc', type: "text", label: "Credit Memo > Description"}).updateDisplayType({displayType:'entry'});
          
        	var subFld = itemSublist.addField({id: 'custpage_cmrate', type: "currency", label: "Credit Memo > Rate"}).updateDisplayType({displayType:'entry'});
        	var subFld = itemSublist.addField({id: 'custpage_cmsalesrep', type: "select", label: "Credit Memo > Sales Rep"});
          	subFld.addSelectOption({value: 0, text: ''});
          	for(var iPos = 0; iPos < salesRepList.length; iPos++)
            {
              	subFld.addSelectOption({value: salesRepList[iPos].id, text: salesRepList[iPos].getValue('entityid')});
            }  
        	var subFld = itemSublist.addField({id: 'custpage_cmdept', type: "select", label: "Credit Memo > Department", source: 'department'});
        	var subFld = itemSublist.addField({id: 'custpage_cmclass', type: "select", label: "Credit Memo > Class", source: 'classification'});
        	var subFld = itemSublist.addField({id: 'custpage_cmmemo', type: "text", label: "Credit Memo > Memo Main"}).updateDisplayType({displayType:'entry'});
              
          
          return itemSublist;
	    }
	    
		return {
		    onRequest: customItemDisplay
		};
	});
