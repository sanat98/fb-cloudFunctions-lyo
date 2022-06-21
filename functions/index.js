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
      let startTime = firestore.Timestamp.now(); // getting time
      const startTimeOfProcess = firestore.Timestamp.now(); // getting time at start of process
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
      let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "data fatId:", snap.data().fat_id, "table id:", snap.data().table_id); //test for snap.data(.tableId) >> if it fails call the doc
     
          functions.logger.log("process started 3");
        
          fatDataGetter( snap.data().company_id ,snap.data().fat_id, snap.data().table_id).then((data) => {
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
            .doc(data.sensor) ///
                .onSnapshot((doc) => {
                  const timeCurrent = firestore.Timestamp.now();
                  const timeIntervalFor = fatData.acceptanceValue;// acceptanceValue is waittingtime
                  functions.logger.log("onSnapshot:timeInterval:", timeCurrent.seconds - startTime.seconds < timeIntervalFor*60,
                      "startTime:", startTime.seconds, "timeIntervalFor:", timeIntervalFor, "fatData:", fatData, "fatData.time:", fatData.acceptanceValue);// acceptance is waittingtime

                  if(doc.data().value <= fatData.start) { 
                    if(!flagCross) {
                      startTime = firestore.Timestamp.now();
                    }
                    flagCross = true;
                    
                    //// as limit has time calculation limit has reached . now have to record that time
                      
                  if ((doc.data().value === fatData.stop || doc.data().value < fatData.stop) && processIsRunning) { // this condition works
                    admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id).update({
                      "observation": "Process has copleted in " + (timeCurrent.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                      "dev" : "Value: " + Math.abs(doc.data().value - fatData.stop) + "Total time: " + (timeCurrent.seconds - startTimeOfProcess.seconds),
                      "confirm": ((timeCurrent.seconds - startTime.seconds)) - (fatData.acceptanceValue*60) <= 0 ? "Yes" : "No",
                    });
                    functions.logger.log("fatData:if: ", fatData);
                    processIsRunning = false;
                    resolve();
                  } else if (processIsRunning) {
                    admin.firestore().collection("A_companyData")
                    .doc(snap.data().company_id)
                    .collection("fatData")
                    .doc(snap.data().fat_id)
                    .collection("table")
                    .doc(snap.data().table_id).update({
                      "observation": "process is running:- " + "Time lapsed after reaching limit: " + (timeCurrent.seconds - startTime.seconds) + " sec" + " and Sensor value: " + doc.data().value,
                    });
                    functions.logger.log("fatData:else: ", fatData);
                  }

                }
                else {
                  flagCross = false;
                  admin.firestore().collection("A_companyData")
                  .doc(snap.data().company_id)
                  .collection("fatData")
                  .doc(snap.data().fat_id)
                  .collection("table")
                  .doc(snap.data().table_id).update({
                    "observation": "process is running:- " + " start limit has not reached. " + "Sensor value: " + doc.data().value,
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
    });
    


// read value of Fat
function fatDataGetter(companyId , fatId, tableId) {
  const data = admin.firestore()
      .collection("A_companyData")
      .doc(companyId)
      .collection("fatData")
      .doc(fatId)
      .collection("table")
      .doc(tableId)
      .get()
      .then((doc) => {
        // console.log('Got rule: ' + doc.data().name);
        functions.logger.log("fatdataGetter fun:", doc.data());
        return doc.data();
      });
  return data;
}

// //////////////////////////////////////////////////-Wait Function-////////////////////////////////////////////////////////

exports.startFatProcessWaitFunction = functions.firestore
    .document("/A_companyData/Arizon12345/fatDataProcessTrigers/waitFunctions/waitFunctionTrigers/{documentId}").onCreate((snap, context) => {
      const startTime = firestore.Timestamp.now(); // getting time
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
      let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "data t:", snap.data().fatDataId, "table id:", snap.data().tableId); //test for snap.data(.tableId) >> if it fails call the doc
      // set start time
      admin.firestore().collection("A_companyData").doc("Arizon12345").collection("fatDataProcessTrigers").doc("waitFunctions").collection("waitFunctionTrigers")
      .doc(context.params.documentId).update({"startTimeTemp": startTime}).then((writeResult) => {
        functions.logger.log("start time recorded2:", writeResult); /// this has no use for now but important for logs.
      });
          functions.logger.log("process started 3");
          // TimeOut start
          fatDataGetter(snap.data().fatDataId, snap.data().tableId).then((data) => {
              setTimeout(() => {
                admin.firestore().collection("A_companyData")
                .doc("Arizon12345")
                .collection("liveData2")
                .doc(data.sensor) ////
                    .onSnapshot((doc) => {
                    if (processIsRunning) {
                    functions.logger.log("time up", data.waitingTime);
                    const timeCurrent2 = firestore.Timestamp.now();
                    const docRef = admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId);
                    if(data.condition == 'equal' && data.acceptanceValue == doc.data().value) {
                    docRef.update({
                      "observation": "Wait function process has copleted in " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                      "dev" : doc.data().value - data.acceptanceValue, // stop is acceptanceValue in wait function
                      "confirm": (doc.data().value - data.acceptanceValue) == 0 ? "Yes" : "No",
                    });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    else if(data.condition == 'less' && data.acceptanceValue < doc.data().value) {
                        docRef.update({
                          "observation": "Wait function process has copleted in " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                          "dev" : data.acceptanceValue - doc.data().value,
                          "confirm": doc.data().value < data.acceptanceValue ? "Yes" : "No",
                        });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    else if(data.condition == 'great' && data.acceptanceValue < doc.data().value) {
                        docRef.update({
                          "observation": "Wait function process has copleted in " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                          "dev" : doc.data().value - data.acceptanceValue,
                          "confirm": doc.data().value > data.acceptanceValue ? "Yes" : "No",
                        });
                    functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                    processIsRunning = false;
                    return null;
                    }
                    else {
                        docRef.update({
                          "observation": "Wait function process has copleted in " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                          "dev" : Math.abs(doc.data().value - data.acceptanceValue), ////
                          "confirm": "No",
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
            functions.logger.log("fatData second5 :", fatData.acceptance)
         
            admin.firestore().collection("A_companyData")
            .doc("Arizon12345")
            .collection("liveData2")
            .doc("Temp-probe1")
                .onSnapshot((doc) => {
                  const timeCurrent2 = firestore.Timestamp.now();
                  functions.logger.log("onSnapshot:timeInterval:", timeCurrent2.seconds - startTime.seconds,
                      "startTime:", startTime.seconds, "fatData:", fatData, "fatData.time:", fatData.waitingTime);
                    if(processIsRunning) {
                    admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId).update({
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
    });
    


// read value of Fat
// function fatDataGetter(fatId, tableId) {
//   const data = admin.firestore()
//       .collection("A_companyData")
//       .doc("Arizon12345")
//       .collection("fatData")
//       .doc(fatId)
//       .collection("table")
//       .doc(tableId)
//       .get()
//       .then((doc) => {
//         functions.logger.log("fatdataGetter fun:", doc.data());
//         return doc.data();
//       });
//   return data;
// }

// ////////////////////////////////////////////////////////Condition Check fun-/////////////////////////////////////////////

exports.startFatConditionCheckFunction = functions.firestore
    .document("/A_companyData/Arizon12345/fatDataProcessTrigers/conditionCheckFunction/conditionCheckFunctionTrigers/{documentId}").onCreate((snap, context) => {
      const startTime = firestore.Timestamp.now(); // getting time
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
     /// let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "data t:", snap.data().fatDataId, "table id:", snap.data().tableId); //test for snap.data(.tableId) >> if it fails call the doc
      // set start time
      admin.firestore().collection("A_companyData").doc("Arizon12345").collection("fatDataProcessTrigers").doc("conditionCheckFunction").collection("conditionCheckFunctionTrigers")
      .doc(context.params.documentId).update({"startTimeTemp": startTime}).then((writeResult) => {
        functions.logger.log("start time recorded2:", writeResult); /// this has no use for now but important for logs.
      });
          functions.logger.log("process started 3");
          fatDataGetter(snap.data().fatDataId, snap.data().tableId).then((data) => {
              return new Promise((resolve, reject) => {
                  fatData = {...data};
                  functions.logger.log("fatData second4 :", fatData.acceptance)
                  resolve();
              })

      .then(() => {
        return new Promise((resolve, reject) => {
            functions.logger.log("fatData second5 :", fatData.acceptanceValue)
            admin.firestore().collection("A_companyData")
            .doc("Arizon12345")
            .collection("liveData2")
            .doc("Temp-probe1")
            .get()
            .then((doc) => {
                  functions.logger.log("get value:", doc.data().value, "startTime:", startTime.seconds, "fatData:", fatData.condition);
                
                    const docRef = admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId);

                    if(fatData.condition == 'equal' && fatData.acceptanceValue == doc.data().value) {
                    docRef.update({
                      "observation": " Condition Check has passed with value = " + doc.data().value,
                      "dev" : doc.data().value - fatData.acceptanceValue,
                      "confirm": "Yes",

                    });
                    }
                    else if(fatData.condition == 'less' && fatData.acceptanceValue < doc.data().value){
                     docRef.update({
                      "observation": " Condition Check has passed with value < " + doc.data().value,
                      "dev" : fatData.acceptanceValue - doc.data().value,
                      "confirm": "Yes",
                    });
                    }
                    else if(fatData.condition == 'great' && fatData.acceptanceValue > doc.data().value){  //keyword check in doc "great" need to change carefully and update here also if change happens
                     docRef.update({
                      "observation": " Condition Check has passed with value > " + doc.data().value,
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
    