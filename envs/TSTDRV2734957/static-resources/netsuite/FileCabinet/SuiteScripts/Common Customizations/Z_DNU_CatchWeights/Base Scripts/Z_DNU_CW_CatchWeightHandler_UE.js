 /**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * Module Description
 * 
 * Version    Date			  Author           Remarks
 * 1.00       07 Jun 2016	  memeremilla	   Initial version
 * 1.10 	  21 Dec 2018	  jjacob		   Fixed governance issue
 *
 */

//-- Import cw_util.js

var STEP = '';
/**
 * Determines if Catch Weight Details exist for an item. Creates a CW Detail field when this script runs before load.
 * @param {String} type Operation types: create, edit, view
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwDetailsHandlerBeforeLoad(type, form, request)
{
	var stLoggerTitle = 'cwDetailsHandlerBeforeLoad';
	nlapiLogExecution('DEBUG', stLoggerTitle, '>> Script Entry <<');
	STEP = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | Script Start ==>' + Date());

    if (type == 'view' || type == 'edit' || type == 'create')
	{
		try
		{
			STEP = '.AddCWDetailTextArea';
			var objItemSublist = form.getSubList('item');
			objItemSublist.addField(FLD_CW_LINK, 'textarea', 'CW Detail');

			STEP = '.ProcessItems';

			var stItemLines = nlapiGetLineItemCount('item');
			var stItemReceiptID = nlapiGetFieldValue('tranid');
			var stCreatedFrom = nlapiGetFieldValue('createdfrom');
			var stRecordType = nlapiGetRecordType();
			var stIFIRId = nlapiGetRecordId();
			
			if(type == 'view')
			{
				var recIFIR = nlapiLoadRecord(stRecordType, stIFIRId);
			}
			
			// v1.10 | URL resolved moved outside of the loop
			var stSLUrl = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);
			
			for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
			{
				nlapiSetLineItemDisabled('item', 'custcol_cw_record_id', true, intCtr);
				
				var stItemId = nlapiGetLineItemValue('item', 'item', intCtr);
				var stQty = nlapiGetLineItemValue('item', 'quantity', intCtr);
				
				// v1.10 
				//var stIsCatchWeightItem = nlapiLookupField('item', stItemId, FLD_CATCH_WEIGHT_ITEM);
				var stIsCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_item_ckbx', intCtr);  
				
				var stAction = '';
				var stCWRecID = '';

				STEP = '.DetermineIfCWItem';

				if(stIsCatchWeightItem == 'T')
				{
					STEP = '.LaunchSuitelet';

					var stUrl = stSLUrl + 
						'&custpage_id=' + stItemReceiptID +
						'&custpage_item=' + stItemId +
						//'&custpage_ifqty=' + stQty +  //taken out since Suitelet-CS line 74 gets the qty from the IR,IF line
						'&custpage_line=' + intCtr +
						'&custpage_rectype=' + stRecordType +
						'&custpage_mode=' + type;

					if(!Eval.isEmpty(stCreatedFrom))
					{
						stUrl += '&custpage_createdfrom=' + stCreatedFrom;
					}

					nlapiLogExecution('debug', 'suitelet', stUrl);

					// if(!Eval.isEmpty(stQty))
					// {
						// stUrl += '&custpage_ifqty=' + stQty;
					// }

					//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Suitelet URL: ' + stUrl + ' | Window Title: ' + HC_POPUP_WINDOW_TITLE + 
							//' | Window Width: ' + HC_POPUP_WIDTH + ' | Window Height: ' + HC_POPUP_HEIGHT);

					if (type == 'view')
					{
						/*Load IF*/
						stCWRecID = recIFIR.getLineItemValue('item', 'custcol_cw_record_id', intCtr);
						stQty = nlapiGetLineItemValue('item', 'quantity', intCtr);

						stUrl += '&custpage_cwdetailid=' + stCWRecID;
						stUrl += '&custpage_ifqty=' + stQty;

						stAction = 'onclick="openCWDetail(\'' + stUrl+ '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
							HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ')"';
                    }
					else
					{
                        stCWRecID = nlapiGetLineItemValue('item', 'custcol_cw_record_id', intCtr);
                       // nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'stCWRecID=' + stCWRecID + ', stQty=' + stQty);

                        stAction = 'onclick="openCWDetail(\'' + stUrl+ '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
							HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ')"';
					}

					var stLinkText = '<a class="i_inventorydetailset" ' + stAction + '></a>';
					//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Link to process: ' + stLinkText);

					objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, stLinkText);

					STEP = '.CheckIFCWDetailsExist';

					/* if (stCWRecID != null) //out 6/27/19, sets all lines disabled-wrong
					{
						var flCatchWeight = Parse.forceFloat(nlapiGetLineItemValue('item', COL_CATCH_WEIGHT, intCtr));
						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '134 flCatchWeight: ' + flCatchWeight);

                        nlapiSetLineItemDisabled('item', COL_CATCH_WEIGHT, true, intCtr);
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Catch Weight Field Disabled. Catch Weight: ' + flCatchWeight);
					}
					else
					{
						//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Details do not exist. | Catch Weight Detail Record: ' + stCWRecID);
					} */

					/* if (stRecordType == 'itemreceipt')
					{
                       var flPriceUM = Parse.forceFloat(getVendorPurchasePrice(stItemId)); //set on IR, 10/25/18
					   nlapiSetLineItemValue('item', COL_PRICE_UM, intCtr, roundOffValue(flPriceUM, 2));
					   nlapiSetLineItemDisabled('item', COL_PRICE_UM, true, intCtr);
					} */
                    nlapiSetLineItemDisabled('item', COL_PRICE_UM, true, intCtr);
				}

			}
		}

		catch(error)
		{
			if(error.getDetails != undefined)
			{
				nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
				//throw error;
			}
			else
			{
				nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
				//throw nlapiCreateError('99999', error.toString());
			}
		}

		form.setScript(nlapiGetContext().getScriptId());
	}
	
	else
	{
		nlapiLogExecution('ERROR', stLoggerTitle + STEP, 'Type: ' + type + ' is not supported for this function. | CW Bundle: Script End ==>' + Date());
		return;
	}
	
	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Script End ==>' + Date());
}




/**
 * Update Catch Weight Details after submit
 * @param type
 * @param form
 * @param request
 */
function cwDetailsHandlerAfterSubmit(type, form, request)
{
	var timestart = new Date().getTime();
	var stLoggerTitle = 'cwDetailsHandlerAfterSubmit';
	STEP = '.Initialization';

	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Type: ' + type + ' | Script Start ==>' + Date());

	try
	{
		if(type == 'create' || type == 'edit')
		{
			STEP = '.LoadRecordAfterSubmit';
			var stRecordType = nlapiGetRecordType();
			var stRecordId = nlapiGetRecordId();

			// v1.10 | Moved here from inside the loop
			var stNonLotItemTypeParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_nonlot_item_types');
			var ARR_NON_LOT_ITEM = stNonLotItemTypeParam.split(',');
			var stCreatedFromType = nlapiGetContext().getSetting('SCRIPT', 'custscript_created_from_param');//for testing only, get id#
          
			nlapiLogExecution('DEBUG', stLoggerTitle, 'scpt params: ARR_NON_LOT_ITEM=' + ARR_NON_LOT_ITEM + ', stCreatedFromType=' + stCreatedFromType);
			nlapiLogExecution('DEBUG', stLoggerTitle, 'stRecordType: ' + stRecordType + ', stRecordId: ' + stRecordId);
			var objRecord = nlapiLoadRecord(stRecordType, stRecordId);
			
			var stIdRec = objRecord.getFieldValue('createdfrom');
			var stRecType = objRecord.getRecordType();
			var sTranId = objRecord.getFieldValue('tranid');
			var bReadyToUpdate = false;
			var stPrefix = '';
			var stQtyColumn = '';
			var stCustomAmountColumn = '';
			var stPendingColumn = '';
			var arrCWRecords = [];
          	var stCreatedFromRecType = objRecord.getFieldText('createdfrom');
        nlapiLogExecution('DEBUG', stLoggerTitle,  'ln 226 -stCreatedFromRecType=' + stCreatedFromRecType + ', stIdRec=' + stIdRec);

			//var stRecUpdate = (stRecType == 'itemfulfillment') ? 'salesorder' : 'purchaseorder';
			// new for RA, 11/14/19
			var stRecUpdate = '';
            var stRectemp = stCreatedFromRecType.substr(0,6);
			if(stRecType == 'itemfulfillment') {
				stRecUpdate = 'salesorder';
			}
			else if(stRectemp == 'Purcha') {
				stRecUpdate = 'purchaseorder';
		nlapiLogExecution('DEBUG', stLoggerTitle,  'ln 237, PO-stCreatedFromRecType=' + stCreatedFromRecType + ', stIdRec=' + stIdRec);
			}
			else if(stRectemp == 'Return') {
				//need to make sure RA is from invoice only-open RA, getvalue of 'createdfrom' if substr=Invoic then continue, else exit w/return;
				var objRecord2 = nlapiLoadRecord('returnauthorization', stIdRec);
				var stCreatedFromRecType2 = objRecord2.getFieldText('createdfrom');
				var stRectemp2 = stCreatedFromRecType2.substr(0,6);
				if(stRectemp2 == 'Invoic') {
					stRecUpdate = 'returnauthorization';
		nlapiLogExecution('DEBUG', stLoggerTitle,  'ln 246, RA - stCreatedFromRecType2=' + stCreatedFromRecType2 + ', stRectemp2=' + stRectemp2);
				}
				else { return; }
			}

			if(stRecordType == 'itemfulfillment')
			{
				stPrefix = 'IF';
				stQtyColumn = 'quantity'; //was quantityfulfilled, quantityremaining=17.2
				stCustomAmountColumn = 'custcol_cw_fulfilled_amount';
				stPendingColumn = 'custcol_cw_pendfulfillamt';
			}
			else if(stRecordType == 'itemreceipt')
			{
				stPrefix = 'IR';
				stQtyColumn = 'quantity'; //was quantityreceived, quantityremaining=17.2
				stCustomAmountColumn = 'custcol_cw_received_amount';
				stPendingColumn = 'custcol_cw_pendreceiptamt';
			}

			//Load PO-SO record and update average weight per physical unit with Actual Weight received
			var intItemLines = objRecord.getLineItemCount('item'); //IF,IR

			var rec = nlapiLoadRecord(stRecUpdate, stIdRec);
			var recLines = rec.getLineItemCount('item');
		    //nlapiLogExecution('DEBUG', stLoggerTitle, 'intItemLines: ' + intItemLines);

			STEP = '.ActualFulfillment';

			for(var intCtr = 1; intCtr <= intItemLines; intCtr++)
			{
				var objCWRecords = {};
				var stOrderLine = objRecord.getLineItemValue('item', 'orderline', intCtr);
				var stIdItem = objRecord.getLineItemValue('item', 'item', intCtr);
				// var flQty = objRecord.getLineItemValue('item', 'quantity', intCtr);
                
				// v1.10 | Lookup API removed. The checkbox flag is 
				// var bCatchWeightItem = nlapiLookupField('item', stIdItem, FLD_CATCH_WEIGHT_ITEM);
				var bCatchWeightItem = objRecord.getLineItemValue('item', 'custcol_cw_item_ckbx', intCtr);
				nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Item: ' + stIdItem + ', intCtr=' + intCtr + ', bCatchWeightItem=' + bCatchWeightItem);
				
				if(bCatchWeightItem == 'T')
				{
					nlapiLogExecution('DEBUG', stLoggerTitle, '----- Processing CW item: line='+intCtr+' -----');
					
					//Set Actual Weight
					var stIRCatchWeight = objRecord.getLineItemValue('item', COL_CATCH_WEIGHT, intCtr);

					bReadyToUpdate = true;
					//nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 274, stIRCatchWeight=' + stIRCatchWeight);

					var stLineRecToUpdate = rec.findLineItemValue('item', 'line', stOrderLine);
					var flQty = Parse.forceFloat(rec.getLineItemValue('item', stQtyColumn, stLineRecToUpdate));
					//nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 278, stIRCatchWeight=' + stIRCatchWeight + ', flQty=' + flQty);
					
					//var flPreviousActWeight = Parse.forceFloat(rec.getLineItemValue('item', COL_ACTUAL_WEIGHT, intCtr)); //line out 5/13/19==VB/Inv should be for each IR/IF
					var flIRCatchWeight = Parse.forceFloat(stIRCatchWeight);
					var flCombinedWeight = flIRCatchWeight; //+ flPreviousActWeight; //out 5/13/19==VB/Inv should be for each IR/IF
					
					nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 284, stIRCatchWeight=' + stIRCatchWeight + ', flQty=' + flQty 
					+ ', flIRCatchWeight=' + flIRCatchWeight + ', flCombinedWeight=' + flCombinedWeight);
					
					if(!Eval.isEmpty(stIRCatchWeight))
					{
						rec.setLineItemValue('item', COL_ACTUAL_WEIGHT, stLineRecToUpdate, flCombinedWeight);
						//nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 290, stLineRecToUpdate=' + stLineRecToUpdate + ', flCombinedWeight=' +flCombinedWeight);
						nlapiLogExecution('DEBUG', stLoggerTitle, 'set line value: line='+intCtr+', '+COL_ACTUAL_WEIGHT+'='+flCombinedWeight);
					}
					// var flRecToUpdateQty = Parse.forceFloat(rec.getLineItemValue('item', 'quantity', stLineRecToUpdate));
					
					//var flPreviousAmount = Parse.forceFloat(rec.getLineItemValue('item', 'custcol_cw_custom_amount', stLineRecToUpdate));//always 0, never set=not needed
					STEP = '.RecordToBeUpdated='+stRecUpdate;
					
					var flRate = 0.00;
					var flWeight = 0.00;
					var flFulfilledAmount = 0.00;
					var flPendingAmount = 0.00;
					var flCurrentQty = 0.00;
					var flPriceUM = 0.00;
					var flRemainingQty = 0.00;
					var flAmount = 0.00;
					var flParentQty = 0.00;
					var flAvgWeight = 0.00;
					
					var bIsChecked = objRecord.getLineItemValue('item', 'itemreceive', intCtr);
					
					if(bIsChecked == 'T')
					{
						STEP = '.ComputeAmountsAndRates';
						
						flCurrentQty = Parse.forceFloat(objRecord.getLineItemValue('item', 'quantity', intCtr));
						flParentQty = Parse.forceFloat(rec.getLineItemValue('item', 'quantity', stLineRecToUpdate));
						//nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 317, flCurrentQty=' + flCurrentQty + ', flParentQty' + flParentQty);
						
						/* if(stRecordType == 'itemfulfillment'){
                            //flPriceUM = Parse.forceFloat(rec.getLineItemValue('item', 'rate', stLineRecToUpdate)); --out for chg to GL impact calc
                            flPriceUM = Parse.forceFloat(rec.getLineItemValue('item', COL_PRICE_UM, stLineRecToUpdate));
                            rec.setLineItemValue('item', COL_PRICE_UM, stLineRecToUpdate, flPriceUM);
                            nlapiLogExecution('DEBUG', stLoggerTitle, 'set line value: line='+intCtr+', '+COL_PRICE_UM+'='+flPriceUM);
				        }
                        else{ */
                            flPriceUM = Parse.forceFloat(rec.getLineItemValue('item', COL_PRICE_UM, stLineRecToUpdate));
                        // }
						
						flAvgWeight = Parse.forceFloat(rec.getLineItemValue('item', COL_AVG_WGHT, stLineRecToUpdate));
						flWeight = flCombinedWeight / flCurrentQty; //orig=flQty
						nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 331, flAvgWeight=' + flAvgWeight + ', flWeight' + flWeight + ', flPriceUM=' + flPriceUM);
						
						if(Eval.isEmpty(stIRCatchWeight))
						{
							/* If we don't specify anything for the catch weight, we will ignore it and just use the item weight instead */
							flWeight = flAvgWeight;
						}
						
						if(stRecordType == 'itemfulfillment'){
							if ((flAvgWeight == 2.2) || (flAvgWeight == .4536)) { flPriceUM = flPriceUM * flAvgWeight; } //for lb-kg conversions
							nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 341, stRecordType=' + stRecordType + ', flPriceUM=' + flPriceUM);
						}
						
						flFulfilledAmount = (flWeight * flPriceUM * flCurrentQty);  //orig=flQty
						flRate = (flWeight * flPriceUM);  //flFulfilledAmount / flQty;
						//flFulfilledAmount = flPreviousAmount + flFulfilledAmount; --flPreviousAmount never used
						flRemainingQty = flParentQty - flCurrentQty;  //orig=flQty
						
						flPendingAmount = flWeight * flRemainingQty * flPriceUM;  //orig=flAvgWeight
						flAmount = flFulfilledAmount; // + flPendingAmount; //removed 6/25/19-overcalc amt for partial IR/IF
						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'ln 352; flRate: ' + flRate + ', Fulfilled Amount: ' + flFulfilledAmount);
						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Remaining Qty: ' + flRemainingQty + ', Fulfilled Amount: ' + flFulfilledAmount + ', Pending Amount: ' + flPendingAmount + ', Total Amount: ' + flAmount);

						STEP = '.SetLineItems';
						//rec.setLineItemValue('item', 'custcol_cw_fulfilled_rate', stLineRecToUpdate, flRate); //field not on any forms?
						rec.setLineItemValue('item', 'rate', stLineRecToUpdate, roundOffValue(flRate, 2)); //to correct GL impact=native qty * rate
						rec.setLineItemValue('item', stCustomAmountColumn, stLineRecToUpdate, flFulfilledAmount);
					nlapiLogExecution('DEBUG', stLoggerTitle, 'set line value: line='+intCtr+', '+stCustomAmountColumn+'='+flFulfilledAmount);
						rec.setLineItemValue('item', stPendingColumn, stLineRecToUpdate, flPendingAmount);
					nlapiLogExecution('DEBUG', stLoggerTitle, 'set line value: line='+intCtr+', '+stPendingColumn+'='+flPendingAmount);
						rec.setLineItemValue('item', 'amount', stLineRecToUpdate, flAmount);
					nlapiLogExecution('DEBUG', stLoggerTitle, 'set line value: line='+intCtr+', amount='+flAmount);

					}

					/* if(stRecUpdate == 'salesorder')
					{
						rec.setLineItemValue('item', COL_CW_AMOUNT, stLineRecToUpdate, flFulfilledAmount);
						nlapiLogExecution('DEBUG', stLoggerTitle, 'set line value: line='+intCtr+', '+COL_CW_AMOUNT+'='+flFulfilledAmount);
					} */

  		            //Address Non-Lot Numbered items
					var stItemType = objRecord.getLineItemValue('item', 'itemtype', intCtr);
					//nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 372  stItemType: ' + stItemType);
					
					if(stItemType == 'InvtPart'){
						var stItemRecType = nlapiLoadRecord('inventoryitem', stIdItem).getRecordType(); //lotnumberedinventoryitem
					} 
                    else if(stItemType == 'Assembly') {
						var stItemRecType = nlapiLoadRecord('assemblyitem', stIdItem).getRecordType(); //lotnumberedassemblyitem
					}
					
					//if(!(ARR_NON_LOT_ITEM.indexOf(stItemRecType) > -1))
					if((ARR_NON_LOT_ITEM.indexOf(stItemRecType) > -1))
					{
						//Update catch weight field on Inventory Number record
						nlapiLogExecution('DEBUG', stLoggerTitle, 'ln 381 stRecUpdate=' + stRecUpdate + ', stIdItem=' + stIdItem);
						updateCatchWeight(stRecUpdate, stIdItem, intCtr, sTranId);
					}

					//Update catch weight field on Inventory Number record
					//updateCatchWeight(stRecUpdate, stIdItem, intCtr, sTranId); //original location
				}

				else
				{
					//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Line: '+ intCtr +' | Item #:' + stIdItem + ' is not a catch weight item. Skipping this line...');
				}
				
				/* Collect CW Custom Record ID */
				var stCWRecordId = objRecord.getLineItemValue('item', 'custcol_cw_record_id', intCtr);
				
				if(!Eval.isEmpty(stCWRecordId))
				{
					objCWRecords.itemid = stIdItem;
					objCWRecords.custrecordid = stCWRecordId;
					objCWRecords.linenum = intCtr;
					
					arrCWRecords.push(objCWRecords);
				}
				
			}
			
			if(bReadyToUpdate)
			{
				STEP = '.UpdateSubmitRecord';
				var stRecID = nlapiSubmitRecord(rec, false, true);
				nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'Record Updated - Type: ' + stRecUpdate + ' | ID: ' + stRecID);
			}
			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'No record update required');
			}
			
			stTranId = objRecord.getFieldValue('tranid');
			STEP = '.UpdateCustomRecordCatchWeight';
			
			if(arrCWRecords.length > 0)
			{
				for(var intCtrA = 0; intCtrA < arrCWRecords.length; intCtrA++)
				{
					var objRecordDetail = arrCWRecords[intCtrA];
					var stCustomRecordId = objRecordDetail.custrecordid;
				
					var stReferenceID = stPrefix + sTranId + '_' + objRecordDetail.itemid + '_' + objRecordDetail.linenum;
				
				    nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'stCustomRecordId=' + stCustomRecordId + ', stReferenceID='+stReferenceID+ ', stTranId=' + stTranId);
					//nlapiSubmitField(REC_CATCH_WEIGHT_DETAILS, stCustomRecordId, ['custrecord_cwd_id', FLD_ITEM_RECEIPT], [stReferenceID, stTranId]); //original, FLD_ITEM_RECEIPT not used by any other script
					nlapiSubmitField(REC_CATCH_WEIGHT_DETAILS, stCustomRecordId, 'custrecord_cwd_id', stReferenceID);
					nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'Updated ' + stCustomRecordId + ' with new Catch Weight Details ID: ' + stReferenceID);
				}
			}

		}

    }
	catch(error)
	{
		if(error.getCode() == 'INVALID_TRANS_TYP')  //when IR/IF comes from Xfer Order
        {
         	nlapiLogExecution('ERROR', 'Process Error', 'Step= ' + STEP + ': err code=' + error.getCode() + ': details=' + error.getDetails());
        	return;
        }
        else if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
	//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Script End ==>' + Date());
	var timeend = new Date().getTime();
	nlapiLogExecution('DEBUG', stLoggerTitle, '--- Total Time='+(timeend-timestart)/1000+' seconds');
	nlapiLogExecution('DEBUG', stLoggerTitle, '--- Remaining Usage='+nlapiGetContext().getRemainingUsage());
}

/**
 * Update Catch Weight Details
 * @param sRecUpdate
 */
function updateCatchWeight(stRecordToUpdate, stItemId, stCurrentLine, stTranId)
{
	var stLoggerTitle = 'updateCatchWeight';
	STEP = '.Initialization';
	
	//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Function entry: Record to update: ' + stRecordToUpdate + ' | Item: ' + stItemId + ' | Current Line ' + stCurrentLine + ' | Transaction ID: ' + stTranId);
	
	try
	{
		STEP = '.GetInventoryDetail';
		nlapiSelectLineItem('item', stCurrentLine);
		
		var flTotalCatchWeight = Parse.forceFloat(nlapiGetCurrentLineItemValue('item', COL_CATCH_WEIGHT));    
		var objInvDetailSubrecord = nlapiViewCurrentLineItemSubrecord('item', 'inventorydetail');
		
		if(objInvDetailSubrecord)
		{
			var flItemQty = nlapiGetCurrentLineItemValue('item', 'quantity');
			var flQtyCounter = 0;
			var intDetailLineCounter = 1;
			
			STEP = '.ProcessItems';
			
			while(flQtyCounter < flItemQty)
			{ 
				try
				{
					/*Loop inside the Inventory Detail*/
					objInvDetailSubrecord.selectLineItem('inventoryassignment', intDetailLineCounter);
					//var stInvDetailId = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','internalid'); - jfernandez original comment
					//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '503 intDetailLineCounter: ' + intDetailLineCounter + ', stRecordToUpdate=' + stRecordToUpdate);
					
					var stSerialNumber, stSerialId, stInternalId;
					var stSourceType = 'Item Fulfillment';
					
					if(stRecordToUpdate == 'salesorder')
					{
						stSerialId = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','issueinventorynumber');
						stSerialNumber = getSerialNumber(stSerialId);
						//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '512 stSerialNumber: ' + stSerialNumber);
					}
					else
					{
						stSerialNumber = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','receiptinventorynumber');//works for lot#, not reg inv item
						stInternalId = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','internalid');
						stSourceType = 'Item Receipt';
						//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '519 ELSE > stSerialNumber: ' + stSerialNumber + ', stInternalId=' + stInternalId);
                        
						if(stSerialNumber == '') 
						{
			                 //stInternalId = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','internalid');
                             //stSerialNumber = objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','binnumber'); -not working
			                 stSerialNumber = getSerialNumber(stInternalId);
			                 //nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '520 Else-If > stSerialNumber: ' + stSerialNumber);
			            }
					}
					
					//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, '530 Record: ' + stRecordToUpdate + ' | Serial Number:' + stSerialNumber + ' | Item ID:' + stItemId);
					
					var flSubrecQty = Parse.forceFloat(objInvDetailSubrecord.getCurrentLineItemValue('inventoryassignment','quantity')); 
					flQtyCounter += flSubrecQty;
					intDetailLineCounter++;
					
					/*Get Inventory Number record id*/
					var stInvDetailId = (stRecordToUpdate == 'salesorder') ? stSerialId : getSerialID(stSerialNumber, stItemId); //only call to this function=getSerialID
					
					//var fCatchWeight = (flTotalCatchWeight / flItemQty) * flSubrecQty; -- original comment by jfernandez
					// var stCWDetailId = getCatchWeightDetails(stTranId + '_' + stItemId + '_' + stCurrentLine);
					var stCWDetailId = nlapiGetCurrentLineItemValue('item', 'custcol_cw_record_id');
					
					if(!Eval.isEmpty(stCWDetailId))
					{
						/*
						 * v1.10 | Load-Save changed to Submit API 
						var recCWDetail = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, stCWDetailId);
						
						var stCWLotNumber = recCWDetail.getFieldValue(FLD_CWD_LOT_NUMBER);
						nlapiLogExecution('DEBUG', 'TRACER', '550 stCWLotNumber:' + stCWLotNumber);
						
						if(Eval.isEmpty(stCWLotNumber))
						{
							recCWDetail.setFieldValue(FLD_CWD_LOT_NUMBER, stSerialNumber);
							recCWDetail.setFieldValue(FLD_REC_SOURCE_TYPE, stSourceType);
						}
						else
						{
							recCWDetail.setFieldValue(FLD_CWD_LOT_NUMBER, stSerialNumber);
						}
						
						STEP = '.Update'+REC_CATCH_WEIGHT_DETAILS;
						var stRecCWDetailId = nlapiSubmitRecord(recCWDetail, false, true);
						nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'CW Detail ID: ' + stRecCWDetailId + ' Inventory Detail ID:' + stInvDetailId);
						*/
						
						// v1.10 | Use of submit API start --------
						var arrFldsToUpdate = [];
						var arrValuesToUpdate = [];
						var stCWLotNumber = recCWDetail.getFieldValue(FLD_CWD_LOT_NUMBER);
						if(Eval.isEmpty(stCWLotNumber))
						{
							arrFldsToUpdate = [FLD_CWD_LOT_NUMBER, FLD_REC_SOURCE_TYPE];
							arrValuesToUpdate = [stSerialNumber, stSourceType]
						}
						else
						{
							arrFldsToUpdate = [FLD_CWD_LOT_NUMBER];
							arrValuesToUpdate = [stSerialNumber];
						}
						
						// Update catch weight detail record
						nlapiSubmitField(REC_CATCH_WEIGHT_DETAILS, stCWDetailId, arrFldsToUpdate, arrValuesToUpdate);
						nlapiLogExecution('AUDIT', stLoggerTitle, 'Catch Wt Detail Record Updated: id='+stCWDetailId 
								+  '|fields='+JSON.stringify(arrFldsToUpdate) + '|values='+JSON.stringify(arrValuesToUpdate));
								
						// v1.10 | Use of submit API end --------
						
						STEP = '.UpdateInventoryNumber';
						var flRemainingCatchWeight = getSerialCatchWeight(stSerialNumber, stItemId);
						//nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Remaining Catch Weight for Item# ' + stItemId + ' with Serial Number:' + stSerialNumber + ':' + flRemainingCatchWeight);
						nlapiLogExecution('AUDIT', stLoggerTitle, 'flRemainingCatchWeight='+flRemainingCatchWeight);
								
						// var recInvNumber = nlapiLoadRecord('inventorynumber', stInvDetailId);
						/*if(stRecordToUpdate == 'salesorder'){//Deduct Catch Weight from inventory detail
							fCatchWeight = flRemainingCatchWeight - flTotalCatchWeight;
							nlapiLogExecution('DEBUG', 'Sales Order', 'fCatchWeight:' + fCatchWeight);
						}*/
						
						// recInvNumber.setFieldValue(FLD_CATCH_WEIGHT_REMAINING, flRemainingCatchWeight);
						// nlapiSubmitRecord(recInvNumber, false, true);
						
						nlapiSubmitField('inventorynumber', stInvDetailId, FLD_CATCH_WEIGHT_REMAINING, flRemainingCatchWeight);
						nlapiLogExecution('AUDIT', stLoggerTitle + STEP, 'Inventory Detail ID:' + stInvDetailId + ', Field(s): ' + FLD_CATCH_WEIGHT_REMAINING + ', Val(s): ' + flRemainingCatchWeight);
					}
				}
				
				catch(error)
				{
					if(error.getDetails != undefined)
					{
						nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
						throw error;
					}
					else
					{
						nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
						throw nlapiCreateError('99999', error.toString());
					}
				}
				
				
			}//--End loop inside Inventory Detail        
		} //--Check if Lot Numbered Item 

		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Item is not a Lot Numbered Item.');
		}
	}
	
	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
	
}

/**
 * Display Catch Weight Details on Sales Order and Invoice
 * @param type
 * @param form
 * @param request
 */
function cwShowDetailsBeforeLoad(type, form, request)
{
	var stLoggerTitle = 'cwShowDetailsBeforeLoad';
	nlapiLogExecution('DEBUG', stLoggerTitle, '>> Script Entry <<');
	
	STEP = '.Initialization';
	
	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | Script Start ==>' + Date());
	
	try
	{
		var stRecordType = nlapiGetRecordType();
					
		if((stRecordType == 'invoice' || stRecordType == 'salesorder') && type == 'view')
		{
		
			var stRecId = '';
			
			
			if(stRecordType == 'invoice')
			{
				stRecId = nlapiGetFieldValue('createdfrom');
			}
			
			else
			{
				stRecId	= nlapiGetRecordId();
			}

			STEP='.GetItemFulfillment';
			
			var stStatus = nlapiGetFieldValue('status');      
			var stItemLines = nlapiGetLineItemCount('item');                       
			var stItemFulfillmentId = getItemFulfillment(stRecId);
				
			STEP = '.ProcessItemsPerFulfillment';
			
			if(!Eval.isEmpty(stItemFulfillmentId))
			{
				var objItemSublist = form.getSubList('item');
				objItemSublist.addField(FLD_CW_LINK, 'text', 'CW Detail');
				
				STEP='.AssembleUrlPerLine';
				
				for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
				{               
					var stLineItemId = nlapiGetLineItemValue('item', 'item', intCtr);            
					var stSLUrl = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);            
					var stUrl = stSLUrl + 
							'&custpage_id=' + stItemFulfillmentId +
							'&custpage_item=' + stLineItemId +
							'&custpage_line=' + intCtr +
							'&custpage_mode=' + 'view';            
					var stAction = 'onclick="openCWDetail(\'' + stUrl+ '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
							HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ')"';
							
					var stLinkText = '<a class="i_inventorydetailset" ' + stAction + '></a>';                                            
					objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, stLinkText);  
					
					nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Index[' + intCtr+ '] : URL: ' + stUrl + 'Link Text: ' + stLinkText);
				}         
			}
			
			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Invoice does not have fulfillments');
			}
		}
		
		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Record type ' + stRecordType + ' not supported by this function. Exiting script.');
		}

		form.setScript(nlapiGetContext().getScriptId());
	}
	
	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
	
	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Script End ==>' + Date());
}

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function cwShowDetailsVBBeforeLoad(type, form, request)
{    
	var stLoggerTitle = 'cwShowDetailsVBBeforeLoad';
	nlapiLogExecution('DEBUG', stLoggerTitle, '>> Script Entry <<');
	STEP = '.Initialization';
	
	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Type: ' + type + ' | Form: ' + form + ' | Request: ' + request + ' | Script Start ==>' + Date());
	
	try
	{
		var stRecordType = nlapiGetRecordType();
		
		if(stRecordType == 'vendorbill' && type == 'view')	//why only view and not create?
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Record Type: ' + stRecordType);           
			
			var stItemLines = nlapiGetLineItemCount('item');                       
			var stLinePOId = nlapiGetLineItemValue('purchaseorders', 'id', 1);//works on demo, not souto??
			
			STEP = '.ProcessPurchaseOrderItems';
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'stLinePOId=' + stLinePOId + ', stItemLines=' + stItemLines);           
			
			if(!Eval.isEmpty(stLinePOId))
			{            
				var stItemReceiptId = getItemReceipt(stLinePOId);
				
				if(!Eval.isEmpty(stItemReceiptId))
				{
					var objItemSublist = form.getSubList('item');
					objItemSublist.addField(FLD_CW_LINK, 'text', 'CW Detail');
					
					STEP = '.AssembleURLPerLine';
					for(var intCtr = 1; intCtr <= stItemLines; intCtr++)
					{               
						var stLineItemId = nlapiGetLineItemValue('item', 'item', intCtr);            
						var stSLUrl = nlapiResolveURL('SUITELET', SCRIPT_CATCH_WEIGHT_SL, DEPLOY_CATCH_WEIGHT_SL);   
						
						var stUrl = stSLUrl + 
								'&custpage_id=' + stItemReceiptId +
								'&custpage_item=' + stLineItemId +
								'&custpage_line=' + intCtr +
								'&custpage_mode=' + 'view';     
								
						var stAction = 'onclick="openCWDetail(\'' + stUrl+ '\', \'' + HC_POPUP_WINDOW_TITLE + '\', ' + 
							HC_POPUP_WIDTH  + ', ' + HC_POPUP_HEIGHT + ')"';

						var stLinkText = '<a class="i_inventorydetailset" ' + stAction + '></a>';          
						
						objItemSublist.setLineItemValue(FLD_CW_LINK, intCtr, stLinkText);     
						nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Index[' + intCtr+ '] : URL: ' + stUrl + 'Link Text: ' + stLinkText);						
					}         
				}
			}
			
			else
			{
				nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Vendor Bill does not have Purchase Order IDs');
			}

		form.setScript(nlapiGetContext().getScriptId());
		}
		
		else
		{
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'Record type ' + stRecordType + ' on ' + type + ' mode not supported by this function. Exiting script.');
		}
	
	}
	
	catch(error)
	{
		if(error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
	
	nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'CW Bundle: Script End ==>' + Date());
}


/**
 * Search Catch Weight Details record
 * @param idRecord
 * @returns
 */
function getCatchWeightDetails(stRecordId)
{
	var stLoggerTitle = 'getCatchWeightDetails';
	STEP = '.Initialization';
	
	try
	{
		var arrSearchFilters = [];        
		arrSearchFilters.push(new nlobjSearchFilter(FLD_CATCH_WEIGHT_DETAILS_ID, null, 'is', stRecordId));
		nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'stRecordId = ' + stRecordId);

		var arrColumns = [];   
		arrColumns.push(new nlobjSearchColumn('internalid', null, null));
		
		var arrSearchResults = [];
		var arrSearchResults = nlapiSearchRecord(REC_CATCH_WEIGHT_DETAILS, null, arrSearchFilters, arrColumns);
        //nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'arrSearchFilters = ' + arrSearchFilters + ', arrColumns = ' + arrColumns);      
		
		if(arrSearchResults)
		{
			return arrSearchResults[0].getId();
			nlapiLogExecution('DEBUG', stLoggerTitle + STEP, 'arrSearchResults[0].getId() ==>' + arrSearchResults[0].getId());
		}
		
		return null;
	}
	
	catch(error)
	{
			if(error.getDetails != undefined)
			{
				nlapiLogExecution('ERROR', 'Process Error', 'Unable to ' + STEP + ': ' + error.getCode() + ': ' + error.getDetails());
				throw error;
			}
			else
			{
				nlapiLogExecution('ERROR', 'Unexpected Error', 'Unable to ' + STEP + ': ' + error.toString());
				throw nlapiCreateError('99999', error.toString());
			}
	}
}

function openCWDetail(stUrl, stitle, intWidth, intHeight){
	var leftPosition = (window.screen.width / 2) - ((intWidth / 2) + 10);
	var topPosition = (window.screen.height / 2) - ((intHeight / 2) + 50);

	//window.open(stUrl, stitle, 'status=no,height=' + intHeight + ',width=' + intWidth + ',resizable=yes,left=' + leftPosition + ',top='
	//  		        + topPosition + ',screenX=' + leftPosition + ',screenY=' + topPosition + ',toolbar=no,menubar=no,scrollbars=yes,location=no,directories=no');
	nlExtOpenWindow(stUrl, stitle, intWidth, intHeight, this, true, null);
}

var Parse = {
/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * 
 * @param {String}
 *            stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
	forceFloat : function(stValue)
	{
		var flValue = parseFloat(stValue);

		if(isNaN(flValue) || (stValue == Infinity))
		{
			return 0.00;
		}

		return flValue;
	}
};

var Eval = {
/**
 * Evaluate if the given string or object value is empty, null or undefined.
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * @author mmeremilla
 */
	isEmpty : function(stValue)
	{
		if ((stValue === '') || (stValue == null) || (stValue == undefined)) //Strict checking for this part to properly evaluate integer value.
		{
			return true;
		}
		else
		{
			if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			{
				if (stValue.length == 0)
				{
					return true;
				}
			}
			else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			{
				for ( var stKey in stValue)
				{
					return false;
				}
				return true;
			}

			return false;
		}
	}

};
