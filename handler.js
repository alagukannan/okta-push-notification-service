'use strict';
const request = require('request');
const AWS = require('aws-sdk');
const parseLinkheader = require('parse-link-header');
const sns = new AWS.SNS();
const lambda = new AWS.Lambda();

const moment = require('moment');
const API_TOKEN = process.env.API_TOKEN;


const publishToSNS = (data) =>{
    // console.log(process.env.TOPIC_ARN,data);
    var params = {
        Message: JSON.stringify(data), /* required */
        TopicArn: process.env.TOPIC_ARN
      };
      sns.publish(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log('messaged SNS', data);           // successful response
      });
};

const callOkta = function(method, where, what, query, callback) {
    const opts = {};
    if(what == undefined) opts.body = "";
    else opts.body = JSON.stringify(what);
    opts.headers = {};
    opts.headers['Content-Length'] = opts.body.length;
    opts.headers['Content-Type'] = "application/json";
    opts.headers['Authorization'] = "SSWS " + API_TOKEN;
    opts.method = method;
    opts.uri = where;
    if(query != null) opts.qs = query;
    request(opts, function(error, clientResp, resp) { handleResponse(error,  clientResp, resp, callback) });
}


const handleResponse = (error, clientResp, resp, callback)=> {
    const returnData = {success: false, error: null, nextPageLink : null, logs: null};
    if(callback == undefined) return;
    if(error) {
        returnData.error = error;
    } else {
        if(clientResp.statusCode === 200) {
            try {
                returnData.logs = JSON.parse(resp);
                const parsedHeaders = parseLinkheader(clientResp.headers.link);
                // console.log(parsedHeaders.hasOwnProperty('next'));
                if(parsedHeaders.hasOwnProperty('next')){
                    returnData.nextPageLink = parsedHeaders.next.url;
                }
                returnData.success = true;
            } catch(err) {
                returnData.error =  err;
            }
        } else if(clientResp.statusCode == 204) {
            returnData.success = true;
        } else if(clientResp.statusCode == 401) {
            try {
                resp = JSON.parse(resp);
            } catch (err) {
                // no-op
            }
            returnData.error = "Unauthoirzed";
        } else {
            returnData.error ="Received HTTP Status code: " + clientResp.statusCode;
        }
    }
    callback(returnData);
}



module.exports.index = (event, context, callback) => {
    const sinceTime = moment().subtract(process.env.POLL_TIME_MINUTES,'minutes').toISOString();
    let OktaLogsUrl = process.env.API_URL + '/api/v1/logs?limit=100&since='+sinceTime;
    if(event.nexturl){
        OktaLogsUrl = event.nexturl;
        console.log('-----------------------------------------------------------------------')
    }
    console.log(OktaLogsUrl);
    // call okta
    callOkta('get', OktaLogsUrl, null, null , function(data){
        if(data.success)
        {
            data.logs.forEach(function(log) {
                console.log(log.eventType);
                // publish to SNS
                publishToSNS(log);
            }, this);
            // if next page trigger another lamda
            if(data.nextPageLink !== null){
                const dataToPass = { nexturl: data.nextPageLink };
                console.log('recursively callings ' + dataToPass.nexturl);
                var params = {
                    FunctionName: context.functionName, 
                    InvocationType: 'Event',
                    Payload: JSON.stringify(dataToPass)
                };              
                lambda.invoke(params, function (err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else console.log(data);           // successful response
                }); 
            }
            console.log('Terminate Lambda');
       
        }
        else{
            console.log('error ' + data.error);
        }
    });
    
    callback(null, { message: 'called function ' + context.functionName, event });
};

