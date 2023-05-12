/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * Samiha Chowdhury 9/12/2022
 *
 */
define(['N/record', 'N/search', 'N/runtime', 'N/task', 'N/format', 'N/file'],
    /**
     * @param {record} record
     * @param {search} search
     */
    function(record, search, runtime, task, format, file) {
        var scriptObj = runtime.getCurrentScript();
        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */

        function execute(scriptContext) {

            //LOAD SEARCH AND RESULTS
            var paymentsSearch = search.load('customsearch11668');
            var list = paymentsSearch.run().getRange(0,999);
            log.debug('Search Results list', list);

            //SS: vendor bills need processing & load them
            if( list != null && list.length > 0)
            {
                var csvStr = '';  //record id hardocoded at beginning, remove py  10/19
                var totalPaymentAmnt=0;
                var totalNumPayments=0;
                var numPayments ='';

                for (var intPos = 0; intPos < list.length; intPos++) {
                    var srchRow = list[intPos];
                    log.debug('srchRow', srchRow);

                    //  var totalPaymentAmount = srchRow.getValue('amount');  //need to use new column INVNET appliedtolinkamount
                    // log.debug("amnt", totalPaymentAmount);

                    var totalPaymentAmount = srchRow.getValue({
                        name: 'appliedtolinkamount',
                        summary: 'max'
                    });
                    log.debug("amnt", totalPaymentAmount);

                    var numPayments2 = srchRow.getValue({
                        name: 'transactionnumber',
                        summary: 'group'
                    });
                    log.audit("numPayments2", numPayments2);

                    var cols = srchRow.columns;
                    log.debug('cols', cols);
                    var csvStrArr = [];
                    log.debug('csvStrArr', csvStrArr);
                    cols.forEach(function (c) {

                        var data = srchRow.getText(c) || srchRow.getValue(c);
                        log.debug('data', data);
                        csvStrArr.push(data);

                    });
                    totalPaymentAmnt += parseFloat(totalPaymentAmount);
                    log.debug('new totalPaymentAmnt', totalPaymentAmnt);

                    //get tally of num of unique payments
                    if (numPayments !== numPayments2) {
                        log.audit('payment number is not the same, will add on to totalNumPayments count');
                        totalNumPayments += parseFloat(1);
                        log.audit('new totalNumPayments', totalNumPayments);
                        numPayments = numPayments2;
                    }
                    csvStr += csvStrArr.join(",") + '\n';
                    log.debug('csvStr', csvStr);
                }

                var recordid = 'HD';
                //AMOD SAID TO USE: datetime stamp in milisecs as unique identifier
                var d = new Date();
                var filecontrolnum = format.format({
                    value: d,
                    type: format.Type.DATETIMETZ
                });
                log.debug('filecontrolnum',filecontrolnum);

                var d = new Date();
                var filedate = format.format({
                    value: d,
                    type: format.Type.DATE
                });
                log.debug('filedate',filedate);

                //new specs sent 10/18/22 from bank need new header to match SS columns
                //var header =  recordid + ',' +filecontrolnum + ',' + filedate;//get comma delimited header


                var header =  'PAYMTHD' + ',' + 'CRDDBTFL' + ',' + 'TRANNO'  + ',' + 'VALDT' + ',' + 	'PAYAMT' + ',' + 'PMTFMTCD' + ',' 	+ 'CUR' + ',' 	+ 'ORIGACCTTY' + ',' + 'ORIGACCT' + ',' + 	'ORIGBNKIDTY' + ',' + 'ORIGBNKID' + ',' + 'RCVPRTYACCTTY'+ ',' 	+ 'RCVPRTYACCT'+ ',' + 'RCVBNKIDTY'+ ',' + 	'RCVBNKID'	+ ',' + 'ORIGTORCVPRTYINF'	+ ',' + 'BATID'	+ ','+  'ORIGPRTYNM' + ','+  'ORIGPRTYADDR1' + ',' + 'ORIGPRTYADDR2' + ',' +  'ORIGPRTYADDR3'	+ ',' + 'ORIGPRTYCTY'	+ ',' + 'ORIGPRTYSTPRO'	+ ',' + 'ORIGPRTYPSTCD' + ',' + 'ORIGPRTYCTRYCD'	+ ',' + 'RCVPRTYNM'+ ',' 	+ 'RCVPRTYID'	+ ','+  'RCVPRTYADDR1'	+ ',' + 'RCVPRTYADDR2' + ',' + 	'RCVPRTYADDR3'	+ ','+  'RCVPRTYCTY' + ','+  'RCVPRTYSTPRO'+ ','  + 'RCVPRTYPSTCD'+ ','  + 'RCVPRTYCTRYCD'	+ ',' + 'RCVBNKNM'	+ ',' + 'RCVBNKCTRYCD'+ ','  + 'CHKNO'	+ ','+  'DOCTMPLNO'+ ','  + 'CHKDELCD'+ ',' + 'ACHCMPID'+ ',' +  'CCRMERCHNTID'+ ',' + 	'PAYEEEMAIL'+ ',' + 'CCRDIVISION'+ ',' + 'FILEFRMT' + ','+ 'DELTYPE_1' + ','+ 'DELCONTNM_1' + ','+ 'DELEMLADDR_1' + ',' + 'INVNO'+ ',' + 'INVDT'+ ',' + 'INVDESC'+ ',' + 'INVNET'+ ',' + 'INVGROSS'+ ',' + 'INVDISCT'+ ',' + 'PONUM'	+ ',' + 'INVTYPE'	+ ',' + 'INVONLYREC';
                log.debug('header',header);
                var recordid = 'TRAILER';
                var paymentcount = list.length; //if its an individual record in search
                log.debug('paymentcount',paymentcount);
                //var totalPaymentAmnt = //2  decimial places, need to set and keep adding amount column every time loop runs
              
               var roundedamount = parseFloat(totalPaymentAmnt).toFixed(2);
               log.debug('rounded totalPaymentAmnt', roundedamount);
                var trailer =  recordid  + ',' + totalNumPayments + ',' + roundedamount;  //get comma delimited trailer
                log.debug('trailer',trailer);
                var finalCsvStr = header  + '\n' + csvStr + trailer;
                log.debug('finalCsvStr',finalCsvStr);

                //put in wells fargo folder

                var filename= 'food.'+ filecontrolnum +'.csv';
                log.debug('filename',filename);

                var fileObj = file.create({
                    name    : filename,  //tfhd.10272022
                    fileType: file.Type.CSV,
                    contents: finalCsvStr
                });
                fileObj.folder = 3624;
                var fileId = fileObj.save();
                log.debug('fileId',fileId);

                //csv file generation
                //header will be a line on the csv file, comma dillemeted
                //trailer will be a line on the CSV FILE

                // var arrColumns = objSearchResult[0].getAllColumns();

            }

        }

        return {
            execute: execute
        };

    });

