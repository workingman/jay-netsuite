/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 * 
 * 
 * Version    Date				Author				Remarks
 * 1.00       08 Jun 2016     memeremilla			Initial version
 *
 */

//'use strict';

var Helper = {};

Helper.getCreatedFromInfo = function(transactionId) {
	var createdFromInfo = {};

	if (!transactionId) {
		return createdFromInfo;
	}
	var createdFromTypeFields = nlapiLookupField('transaction', transactionId, ['type']);
	var createdFromTypeString = createdFromTypeFields['type'];

	switch (createdFromTypeString) {
		case 'RtnAuth':
			createdFromInfo.sourceType = 'Return Authorization';
			createdFromInfo.reference = 'returnauth';
			break;
		case 'SalesOrd':
			createdFromInfo.sourceType = 'Sales Order';
			createdFromInfo.reference = 'salesorder';
			break;
		case 'PurchOrd':
			createdFromInfo.sourceType = 'Purchase Order';
			createdFromInfo.reference = 'purchaseorder';
			break;
		default:
			createdFromInfo.sourceType = 'Other';
			break;
	}

	return createdFromInfo;
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @return {void} Any output is written via response object
 */
 
 var ID_NEW = '';
function setCWDetailsFormSuitelet(request, response)
{
	try
	{
		var stAction = request.getParameter(FLD_SL_ACTION);
		if (stAction == null)
		{
			var stIdTransRefNum = request.getParameter(PARAM_ID_ITEM_RECEIPT);
			var stIdLineItem = request.getParameter(PARAM_ID_LINE_ITEM);
			var stNLineNumber = request.getParameter(PARAM_LINE_NUMBER);
			var stMode = request.getParameter(PARAM_PAGE_MODE);
			var stQty = request.getParameter('custpage_ifqty');
			var stCreatedFrom = request.getParameter('custpage_createdfrom');
			var stRecordType = request.getParameter('custpage_rectype');
			var stCWDetailId = request.getParameter('custpage_cwdetailid');
			var stPrefix = '';
			var stSource = '';
			var stTransactionRef = '';
			
			if(stRecordType == 'itemfulfillment')
			{
				stRecordType = 'Item Fulfillment';
				stPrefix = 'IF';
			}
			else if(stRecordType == 'itemreceipt')
			{
				stRecordType = 'Item Receipt';
				stPrefix = 'IR';
			}

			var createdFromInfo = Helper.getCreatedFromInfo(stCreatedFrom);
			stSource = createdFromInfo.sourceType;

			stTransactionRef = [
				createdFromInfo.reference,
				stCreatedFrom,
				stIdLineItem,
				stNLineNumber
			].join('_');
			
			var arrParam =
				[
				        stIdTransRefNum, stIdLineItem, stNLineNumber, stMode
				];

			if (NSUtil.inArray(null, arrParam) || NSUtil.inArray('', arrParam))
			{
				throw nlapiCreateError('9999', 'Missing required parameters.');
			}

			var objFrm = nlapiCreateForm('Catch Weight Inventory Detail', true);
			var stSublistType = 'staticlist'; //for view mode 

			if (stMode != 'view')
			{
				objFrm.addSubmitButton('Submit');
				if (stMode == 'create' || stMode == 'edit') {
                    objFrm.setScript(SCRIPT_CATCH_WEIGHT_DETAILS_CS);
                }
				stSublistType = 'inlineeditor'; //for create or edit mode
			}
			
			if (stMode == 'view' || stMode == 'edit')
			{
                var stIdCatchWeightDetail = stPrefix + stIdTransRefNum + '_' + stIdLineItem + '_' + stNLineNumber;  //Original
                var stCWDetailId = getCatchWeightDetails(stIdCatchWeightDetail); //get id for edit mode
			}
            else if (stMode == 'create')
            {
                var stIdCatchWeightDetail = stTransactionRef; //avoid IR,IF record nbr, AJ 9/10/18
            }

			var objFldItemReceipt = objFrm.addField(FLD_SL_ITEM_RECEIPT, 'text', 'Ref No');
			objFldItemReceipt.setDefaultValue(stIdCatchWeightDetail);
			objFldItemReceipt.setDisplayType('inline');
			
			var objFldLineItem = objFrm.addField(FLD_SL_IR_ITEM, 'select', 'Item', 'item');
			objFldLineItem.setDefaultValue(stIdLineItem);
			objFldLineItem.setDisplayType('inline');

			var objFldLineQuantity = objFrm.addField('custpage_ifqty', 'integer', 'Quantity');
			objFldLineQuantity.setDefaultValue(stQty);
			objFldLineQuantity.setDisplayType('inline');
			
			var objFldLotNumber = objFrm.addField(FLD_SL_LOT_NUMBER, 'text', 'Lot Number');
			objFldLotNumber.setDisplayType('inline');

			var objFldAction = objFrm.addField(FLD_SL_ACTION, 'text', '');
			objFldAction.setDisplayType('hidden');
			objFldAction.setDefaultValue('submit');

			var objFldLineNumber = objFrm.addField(FLD_SL_IR_LINE, 'text', '');
			objFldLineNumber.setDisplayType('hidden');
			objFldLineNumber.setDefaultValue(stNLineNumber);

			var objFldTranId = objFrm.addField('custpage_tranid', 'text', 'Transaction #');
			objFldTranId.setDefaultValue(stTransactionRef);
			objFldTranId.setDisplayType('inline');

			if (stCreatedFrom) {
				var objFldSourceTransaction = objFrm.addField('custpage_source_transaction', 'select', 'Transaction', 'transaction');
				objFldSourceTransaction.setDefaultValue(stCreatedFrom);
				objFldSourceTransaction.setDisplayType('inline');

				var objFldType = objFrm.addField('custpage_type', 'text', 'Source Record Type');
				objFldType.setDefaultValue(stSource);
				objFldType.setDisplayType('inline');
			}
			
			//create sublist        
			var objLst = objFrm.addSubList(SBL_CW_DETAILS, stSublistType, 'Catch Weight Details');
			objLst.addField(COL_SL_CASE, 'text', 'Case');
			objLst.addField(COL_SL_WEIGHT, 'text', 'Weight');

			var objFldTotalWeight = objFrm.addField(FLD_SL_TOTAL_WEIGHT, 'float', 'Total Weight').setDisplayType('disabled');

			var flTotalCWDWeight = NSUtil.forceFloat(0);
			var stLotNumber = '';

			//Load Catch Weight Details subrecord if already exist			
			if (!NSUtil.isEmpty(stCWDetailId))
			{
				var recCWDetails = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, stCWDetailId);
				var stNCWDLines = recCWDetails.getLineItemCount(SBL_CASE);
				stLotNumber = recCWDetails.getFieldValue(FLD_CWD_LOT_NUMBER);
				for (var intCtr = 1; intCtr <= stNCWDLines; intCtr++)
				{
					var stCaseName = recCWDetails.getLineItemValue(SBL_CASE, COL_CASE_NAME, intCtr);
					var flCaseWeight = NSUtil.forceFloat(recCWDetails.getLineItemValue(SBL_CASE, COL_CASE_WEIGHT, intCtr));

					objLst.setLineItemValue(COL_SL_CASE, intCtr, stCaseName);
					objLst.setLineItemValue(COL_SL_WEIGHT, intCtr, flCaseWeight);
				}
				flTotalCWDWeight = recCWDetails.getFieldValue(FLD_TOTAL_CW); //added AJ 8/28/18, to show wgt
				objFldLineQuantity.setDefaultValue(stNCWDLines); //added AJ 9/20/18, to set qty
			}
			objFldLotNumber.setDefaultValue(stLotNumber);
			objFldTotalWeight.setDefaultValue(NSUtil.roundDecimalAmount(flTotalCWDWeight, 2));
			response.writePage(objFrm);
		}
		else if (stAction == 'submit')
		{
			// var stCloseAction = '<script>window.parent.cwDetailsSaveRecord();';
			var stIdTransRefNum = request.getParameter(FLD_SL_ITEM_RECEIPT);
			var stIdLineItem = request.getParameter(FLD_SL_IR_ITEM);
			var stNLineNumber = request.getParameter(FLD_SL_IR_LINE);
			var stSourceType = request.getParameter('custpage_type');
			var flQty = NSUtil.forceFloat(request.getParameter('custpage_ifqty'));
			var stIdCatchWeightDetail = stIdTransRefNum;
			
			var arrParam =
				[
				        stIdTransRefNum, stIdLineItem, stNLineNumber
				];

			if (NSUtil.inArray(null, arrParam) || NSUtil.inArray('', arrParam))
			{
				throw nlapiCreateError('9999', 'Missing required parameters.');
			}

			//Check if Catch Weight Details subrecord already exist
			var stCWDetailId = getCatchWeightDetails(stIdCatchWeightDetail);

			//Load Catch Weight Details subrecord and update if already exist, otherwise, create new record
			if (!NSUtil.isEmpty(stCWDetailId))
			{
				var recCatchWeightDetails = nlapiLoadRecord(REC_CATCH_WEIGHT_DETAILS, stCWDetailId);

				//Remove lines from Catch Weight Details record==why? because they get duplicated otherwise
				var stNRecCWDLines = recCatchWeightDetails.getLineItemCount(SBL_CASE);
				for (var intCtr = stNRecCWDLines; intCtr >= 1; intCtr--)
				{
					recCatchWeightDetails.removeLineItem(SBL_CASE, intCtr);
				}
			} //-----End Update Catch Weight Details Subrecord
			else
			{
				var recCatchWeightDetails = nlapiCreateRecord(REC_CATCH_WEIGHT_DETAILS);
				recCatchWeightDetails.setFieldValue(FLD_CATCH_WEIGHT_DETAILS_ID, stIdCatchWeightDetail);
				
				//recCatchWeightDetails.setFieldValue(FLD_ITEM_RECEIPT, stCreatedFrom); //was stIdTransRefNum, not used by any other script
				recCatchWeightDetails.setFieldValue(FLD_LINE_ITEM, stIdLineItem); 
				recCatchWeightDetails.setFieldValue(FLD_REC_SOURCE_TYPE, stSourceType);
				
			} //-----End Create new Catch Weight Details Subrecord

			//Insert/re-insert catch weight lines
			var stNLineItemCount = request.getLineItemCount(SBL_CW_DETAILS);
			var flTotalWeight = NSUtil.forceFloat(0);

			for (var intCtr = 1; intCtr <= stNLineItemCount; intCtr++)
			{
				var stCaseName = request.getLineItemValue(SBL_CW_DETAILS, COL_SL_CASE, intCtr);
				var flWeight = request.getLineItemValue(SBL_CW_DETAILS, COL_SL_WEIGHT, intCtr);
				flTotalWeight += NSUtil.forceFloat(flWeight);
				recCatchWeightDetails.selectNewLineItem(SBL_CASE);
				recCatchWeightDetails.setCurrentLineItemValue(SBL_CASE, COL_CASE_NAME, stCaseName);
				recCatchWeightDetails.setCurrentLineItemValue(SBL_CASE, COL_CASE_WEIGHT, flWeight);
				recCatchWeightDetails.commitLineItem(SBL_CASE);
			}
			
			flTotalWeight = NSUtil.roundDecimalAmount(flTotalWeight, 2);
			recCatchWeightDetails.setFieldValue(FLD_TOTAL_CW, flTotalWeight);
			
			
			/*STEP ='.GetTotalWeightVariance';  //** START new CW custom fields
			var objCWItemDetails = nlapiLookupField('item', stIdLineItem, [FLD_CW_WEIGHT_TOLERANCE, 'weight', 'unitstype', 'custitem_cw_pricing_units_type']);
			var objCWItemFldTxtValue = nlapiLookupField('item', stIdLineItem, ['custitem_cw_purchase_pricing_unit', 'custitem_cw_sales_pricing_unit', 'purchaseunit', 'saleunit'], true); //for multiple UoM

            var stIdPhysicalUnitsType = objCWItemDetails['custitem_cw_pricing_units_type']; //custom unit type field
			var stPOUnitName = objCWItemFldTxtValue['custitem_cw_purchase_pricing_unit'];
			var stSOUnitName = objCWItemFldTxtValue['custitem_cw_sales_pricing_unit'];
			var flWeightTolerance = NSUtil.forceFloat(objCWItemDetails.custitem_cw_weight_tolerance);
			flWeightTolerance /= 100;
			var flItemWeight = objCWItemDetails.weight; //NSUtil.forceFloat(objCWItemDetails.weight);

            //To acct for multiple UoM
            if (stSourceType == 'Purchase Order') {
                var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType)); //custom unit type fields
                if (flConversionRate == 0) {
                    //re-do with native Physical Units Type
                	var stIdPhysicalUnitsType = objCWItemDetails['unitstype']; //native Item header fields
					var stPOUnitName = objCWItemFldTxtValue['purchaseunit'];
                	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stPOUnitName, stIdPhysicalUnitsType));
                }
                var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
            } else {
                var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType)); //custom unit type fields
                if (flConversionRate == 0) {
                    //re-do with native Physical Units Type
                	var stIdPhysicalUnitsType = objCWItemDetails['unitstype']; //native Item header fields
					var stSOUnitName = objCWItemFldTxtValue['saleunit'];
                	var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stSOUnitName, stIdPhysicalUnitsType));
                }                
				if ((flConversionRate == 2.2) || (flConversionRate == .4536)) { //need to * by quantity, oddball for kilos
					var flWeightConv = flItemWeight;
				} else {
					var flWeightConv = NSUtil.forceFloat(flItemWeight * flConversionRate);
				}
            }  //**END new CW custom fields

			var flVariance = flQty * flWeightConv; //flItemWeight;
			var flThreshold =  flVariance * flWeightTolerance;
			var flPosVariance = flVariance + flThreshold;
			var flNegVariance = flVariance - flThreshold;

			if(flTotalWeight > flPosVariance) //ERROR Msg will STOP suitelet from saving partial rcpt/fulfill-have to fill in again=NOT popular
			{
				throw nlapiCreateError('99999', 'Total weight exceeds Threshold of ' + flPosVariance + '. Please go back and try again.');
			}
			else if(flTotalWeight < flNegVariance)
			{
				throw nlapiCreateError('99999', 'Total weight does not meet minimum Threshold of ' + flNegVariance + '. Please go back and try again.');
			}
			*/
			var stIdCWD = nlapiSubmitRecord(recCatchWeightDetails, false, true);
			var stCloseAction = '<script>window.parent.cwDetailsSaveRecord2(' + stIdCWD +','+flTotalWeight+','+stNLineNumber+');</script>';
			response.write(stCloseAction);
		}
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}