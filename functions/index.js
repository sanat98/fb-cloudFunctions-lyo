const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {firestore} = require("firebase-admin");
// const {firestore} = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

exports.startFatProcessTimePeriod = functions.firestore
    .document("/A_fatTriggers/time-period-fun/time-period-fun-triggers/{documentId}").onCreate((snap, context) => {
      fatDataGetter(snap.data().company_id , snap.data().fat_report_id ,snap.data().fat_id, snap.data().table_id).then((data) => {
        functions.logger.log("timePeriodMain has called outer (if)");

        if(data?.process_active === true) {
        functions.logger.log("timePeriodMain is allready in frogress")  
      }
      else{
        functions.logger.log("timePeriodMain has called (if)");
        admin.firestore().collection("A_companyData")
        .doc(snap.data().company_id)
        .collection("fatReportData")
        .doc(snap.data().fat_report_id)
        .collection("fatData")
        .doc(snap.data().fat_id)
        .collection("table")
        .doc(snap.data().table_id).set({
          "process_active": true,
          "observation": "",
          "dev": "",
        }, {merge: true});
        timePeriodMain(snap, context); // this is the MAIN call
      }
    })
    });
    function timePeriodMain(snap, context) {
      let startTime = firestore.Timestamp.now(); // getting time
      let startValueLimit = 0; // used in deviation
      const startTimeOfProcess = firestore.Timestamp.now(); // getting time at start of process
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
      let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "reportId: ", snap.data().fat_report_id, "data fatId:", snap.data().fat_id, "table id:", snap.data().table_id); //test for snap.data(.tableId) >> if it fails call the doc
     
          functions.logger.log("process started 3");
        
          fatDataGetter( snap.data().company_id , snap.data().fat_report_id ,snap.data().fat_id, snap.data().table_id).then((data) => { // now we can remove fatDataGetter as it is called above
              return new Promise((resolve, reject) => {
                  fatData = {...data};
                  functions.logger.log("fatData second4 :", fatData.acceptanceValue)
                  resolve();
              })

      .then(() => {
        return new Promise((resolve, reject) => {
            functions.logger.log("fatData second5 :", fatData.acceptanceValue)
            let flagCross = false;
            admin.firestore().collection("A_companyData")
            .doc(snap.data().company_id)
            .collection("liveData2")
            .doc(fatData.sensor) ///
                .onSnapshot((doc) => {
                  const timeCurrent = firestore.Timestamp.now();
                  const timeIntervalFor = fatData.acceptanceValue;// acceptanceValue is waittingtime
                  functions.logger.log("onSnapshot:timeInterval:", timeCurrent.seconds - startTime.seconds < timeIntervalFor*60,
                      "startTime:", startTime.seconds, "timeIntervalFor:", timeIntervalFor, "fatData:", fatData, "fatData.time:", fatData.acceptanceValue);// acceptance is waittingtime

                  if(doc.data().value <= fatData.start) { 
                    if(!flagCross) { // Change it to explisit false , after discussion (also check else)
                      startTime = firestore.Timestamp.now(); // updating the startTime with time when start point reaches
                      if(startValueLimit === 0) {
                        startValueLimit = doc.data().value;
                      }
                    }
                    flagCross = true;
                    
                    //// as limit has time calculation limit has reached . now have to record that time
                      
                  if ((doc.data().value === fatData.stop || doc.data().value < fatData.stop) && processIsRunning) { // this condition works
                    let timeTakenInSec = Math.ceil(timeCurrent.seconds - startTime.seconds);
                    let timeTaken = secondToFormat(timeTakenInSec); // time formater in hr:min:sec
                    admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatReportData")
                    .doc(snap.data().fat_report_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id).set({
                      "observation": timeTaken,
                      "dev" : startValueLimit + " to " + doc.data().value, // "Value: " + Math.abs(doc.data().value - fatData.stop) + " and Total time: " + (timeCurrent.seconds - startTimeOfProcess.seconds),
                      "confirm": ((timeCurrent.seconds - startTime.seconds)) - (fatData.acceptanceValue*60) <= 0 ? "Yes" : "No",
                      "process_active": false
                    }, {merge: true});
                    functions.logger.log("fatData:if: ", fatData);
                    processIsRunning = false;
                    resolve();
                  } else if (processIsRunning) {
                    let timeTakenInSec = Math.ceil(timeCurrent.seconds - startTime.seconds);
                    let timeTaken = secondToFormat(timeTakenInSec); // time formater in hr:min:sec
                    admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatReportData")
                    .doc(snap.data().fat_report_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id).update({
                      "observation": "process running, value: " + doc.data().value,
                    });
                    functions.logger.log("fatData:else: ", fatData);
                  }

                }
                else {
                  flagCross = false; // start limit has not reached.
                  startValueLimit = fatData.start;
                  admin.firestore().collection("A_companyData")
                  .doc(snap.data().company_id)
                  .collection("fatReportData")
                  .doc(snap.data().fat_report_id)
                  .collection("fatData")
                  .doc(snap.data().fat_id)
                  .collection("table")
                  .doc(snap.data().table_id).update({
                    "observation": "process running, " + "Value: " + doc.data().value,
                  });
                  functions.logger.log("fatData:else outer: ", fatData);

                }
                });

      }).then(() => {
        functions.logger.log("cloudFunction ends: ", processIsRunning);
        return null;
      });
    })
    })
    };
    


// read value of Fat
function fatDataGetter(companyId , reportId, fatId, tableId) {
  functions.logger.log("fatDaterGetter 1 :", companyId , reportId, fatId, tableId)
  return data = admin.firestore()
      .collection("A_companyData")
      .doc(companyId)
      .collection("fatReportData")
      .doc(reportId)
      .collection("fatData")
      .doc(fatId)
      .collection("table")
      .doc(tableId)
      .get()
      .then((doc) => {
        // console.log('Got rule: ' + doc.data().name);
        functions.logger.log("fatdataGetter 2:", doc.data());
        return doc.data();
      });
  // functions.logger.log("fatDataGetter 3 :" , data);
  // return data;
}

// second to hr:mn:sec
 function secondToFormat(seconds){
  let p1 = seconds % 60;
  let p2 = Math.floor(seconds / 60);
  let p3 = p2 % 60;
  p2 = Math.floor(p2 / 60);

//  let s = p2 + ":" + p3 + ":" + p1;
  let s = "";
  if (p2 != 0){
    let hr = " " + p2 + " Hr";
    s += hr;
  }
  if (p3 != 0){
    let min = " " + p3 + " Min";
    s += min;
  }
  if (p1 != 0){
    let sec = " " + p1 + " Sec";
    s += sec;
  }
  return s;
}

// //////////////////////////////////////////////////-Wait Function-////////////////////////////////////////////////////////

exports.startFatProcessWaitFunction = functions.firestore
    .document("/A_fatTriggers/wait-function/wait-fun-triggers/{documentId}").onCreate((snap, context) => {
      fatDataGetter(snap.data().company_id , snap.data().fat_report_id ,snap.data().fat_id, snap.data().table_id).then((data) => {
        functions.logger.log("waitFunctionMain has called outer (if)");

        if(data.process_active === false) {
        functions.logger.log("waitFunctionMain has called (if)");
        admin.firestore().collection("A_companyData")
        .doc(snap.data().company_id)
        .collection("fatReportData")
        .doc(snap.data().fat_report_id)
        .collection("fatData")
        .doc(snap.data().fat_id)
        .collection("table")
        .doc(snap.data().table_id).update({
          "process_active": true
        });
        waitFunctionMain(snap, context); // this is the MAIN call
      }
      else{
        functions.logger.log("waitFunctionMain is allready in frogress")
      }
    })
    .catch((e) => functions.logger.log('catch: ', e))
    });
    function waitFunctionMain(snap, context) {
      const startTime = firestore.Timestamp.now(); // getting time
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
      let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "data fat:", snap.data().fat_id, "table id:", snap.data().table_id); //test for snap.data(.tableId) >> if it fails call the doc
      // set start time
      // admin.firestore().collection("A_companyData").doc("Arizon12345").collection("fatDataProcessTrigers").doc("waitFunctions").collection("waitFunctionTrigers")
      // .doc(context.params.documentId).update({"startTimeTemp": startTime}).then((writeResult) => {
      //   functions.logger.log("start time recorded2:", writeResult); /// this has no use for now but important for logs.
      // });
          functions.logger.log("process started 3");
          // TimeOut start
          fatDataGetter(snap.data().company_id, snap.data().fat_report_id, snap.data().fat_id, snap.data().table_id).then((data) => { // now we can remove fatDataGetter as it is called above
              setTimeout(() => {
                admin.firestore().collection("A_companyData")
                .doc(snap.data().company_id)
                .collection("liveData2")
                .doc(data.sensor) ////
                    .onSnapshot((doc) => {
                    if (processIsRunning) {
                    functions.logger.log("time up", data.waitingTime);
                    const timeCurrent2 = firestore.Timestamp.now();
                    let timeTakenInSec = Math.ceil(timeCurrent2.seconds - startTime.seconds);
                    let timeTaken = secondToFormat(timeTakenInSec); // time formater in hr:min:sec
                    const docRef = admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatReportData")
                    .doc(snap.data().fat_report_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id);
                    if(data.condition == 'equal' && data.acceptanceValue == doc.data().value) {
                    docRef.update({
                      "observation": "Wait function process has copleted in " + timeTaken + " with value = " + doc.data().value,
                      "dev" : doc.data().value - data.acceptanceValue, // stop is acceptanceValue in wait function
                      "confirm": (doc.data().value - data.acceptanceValue) == 0 ? "Yes" : "No",
                      "process_active": false
                    });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    else if(data.condition == 'less' && data.acceptanceValue < doc.data().value) {
                        docRef.update({
                          "observation": "Wait function process has copleted in " + timeTaken + " with value = " + doc.data().value,
                          "dev" : data.acceptanceValue - doc.data().value,
                          "confirm": doc.data().value < data.acceptanceValue ? "Yes" : "No",
                          "process_active": false
                        });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    else if(data.condition == 'great' && data.acceptanceValue < doc.data().value) {
                        docRef.update({
                          "observation": "Wait function process has copleted in " + timeTaken + " with value = " + doc.data().value,
                          "dev" : doc.data().value - data.acceptanceValue,
                          "confirm": doc.data().value > data.acceptanceValue ? "Yes" : "No",
                          "process_active": false
                        });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    else {
                        docRef.update({
                          "observation": "Wait function process has copleted in " + timeTaken + " with value = " + doc.data().value,
                          "dev" : Math.abs(doc.data().value - data.acceptanceValue), ////
                          "confirm": "No",
                          process_active: false
                        });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    
                    
                   }
                });
              }, data.waitingTime*60*1000); // This is important
              // timeOut close
              return new Promise((resolve, reject) => {
                  fatData = {...data};
                  functions.logger.log("fatData second4 :", fatData.acceptance)
                  resolve();
              })

      .then(() => {
        return new Promise((resolve, reject) => {
            functions.logger.log("fatData second5 :", fatData.acceptance, "fatdData.sensor: ", fatData.sensor)
         
            admin.firestore().collection("A_companyData")
            .doc(snap.data().company_id)
            .collection("liveData2")
            .doc(fatData.sensor)
                .onSnapshot((doc) => {
                  const timeCurrent2 = firestore.Timestamp.now();
                  functions.logger.log("onSnapshot:timeInterval:", timeCurrent2.seconds - startTime.seconds,
                      "startTime:", startTime.seconds, "fatData:", fatData, "fatData.time:", fatData.waitingTime);
                    if(processIsRunning) {
                    admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatReportData")
                    .doc(snap.data().fat_report_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id).update({
                      "observation": "Wait function process is running, time lapsed: " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " current value = " + doc.data().value,
                    });
                    functions.logger.log("fatData:if: ", fatData);
                    }
                });

      }).then(() => {
        functions.logger.log("cloudFunction ends: ", processIsRunning);
        return null;
      });
    })
    })
    };

// ////////////////////////////////////////////////////////Condition Check fun-/////////////////////////////////////////////

exports.startFatConditionCheckFunction = functions.firestore
    .document("/A_fatTriggers/condition-check-fun/condition-check-fun-triggers/{documentId}").onCreate((snap, context) => {
      const startTime = firestore.Timestamp.now(); // getting time
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
     /// let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "data t:", snap.data().fat_id, "table id:", snap.data().table_id); //test for snap.data(.tableId) >> if it fails call the doc
      // set start time
      // admin.firestore().collection("A_companyData").doc(snap.data().company_id).collection("fatDataProcessTrigers").doc("conditionCheckFunction").collection("conditionCheckFunctionTrigers")
      // .doc(context.params.documentId).update({"startTimeTemp": startTime}).then((writeResult) => {
      //   functions.logger.log("start time recorded2:", writeResult); /// this has no use for now but important for logs.
      // });
          functions.logger.log("process started 3");
          fatDataGetter(snap.data().company_id, snap.data().fat_report_id, snap.data().fat_id, snap.data().table_id).then((data) => {
              return new Promise((resolve, reject) => {
                  fatData = {...data};
                  functions.logger.log("fatData second4 :", fatData.acceptanceValue)
                  resolve();
              })

      .then(() => {
        return new Promise((resolve, reject) => {
            functions.logger.log("fatData second5 :", fatData.acceptanceValue)
            admin.firestore().collection("A_companyData")
            .doc(snap.data().company_id)
            .collection("liveData2")
            .doc(fatData.sensor)
            .get()
            .then((doc) => {
                  functions.logger.log("get value:", doc.data().value, "startTime:", startTime.seconds, "fatData condition:", fatData.condition);
                
                    const docRef = admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatReportData")
                    .doc(snap.data().fat_report_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id);

                    if(fatData.condition == 'equal' && fatData.acceptanceValue == doc.data().value) {
                    docRef.update({
                      "observation": " Condition Check has passed " + " given value: " + fatData.acceptanceValue + " = " + " sensor value: " + doc.data().value,
                      "dev" : doc.data().value - fatData.acceptanceValue,
                      "confirm": "Yes",

                    });
                    }
                    else if(fatData.condition == 'less' && fatData.acceptanceValue < doc.data().value){
                     docRef.update({
                      "observation": " Condition Check has passed " + " given value: " + fatData.acceptanceValue + " < " + " sensor value: " + doc.data().value,
                      "dev" : fatData.acceptanceValue - doc.data().value,
                      "confirm": "Yes",
                    });
                    }
                    else if(fatData.condition == 'great' && fatData.acceptanceValue > doc.data().value){  //keyword check in doc "great" need to change carefully and update here also if change happens
                     docRef.update({
                      "observation": " Condition Check has passed " + " given value: " + fatData.acceptanceValue + " > " + " sensor value: " + doc.data().value,
                      "dev" : doc.data().value - fatData.acceptanceValue,
                      "confirm": "Yes",
                    });
                    }
                    else {
                     docRef.update({
                      "observation": " Condition Check has FAILED: value: " + doc.data().value + " / " + fatData.acceptanceValue,
                      "dev" : Math.abs(doc.data().value - fatData.acceptanceValue), // tested
                      "confirm": "No",
                    });
                    }
                    functions.logger.log("fatData:if: ", fatData.condition);
                    resolve();
                });

      }).then(() => {
        functions.logger.log("cloudFunction ends: ");
        return null;
      });
    });
    });
    functions.logger.log("cloudFunction finishes: ");
    return 0;
    });
    