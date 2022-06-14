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
    .document("/A_companyData/Arizon12345/fatDataProcessTrigers/{documentId}").onCreate((snap, context) => {
      const startTime = firestore.Timestamp.now(); // getting time
      // get the current value
      // const activeProcessInfo = snap.data();
      let fatData = {};
      let processIsRunning = true;
      functions.logger.log("activeProcessInfo1:", "id:", context.params.documentId, "data t:", snap.data().fatDataId, "table id:", snap.data().tableId); //test for snap.data(.tableId) >> if it fails call the doc
      // set start time
      admin.firestore().collection("A_companyData").doc("Arizon12345").collection("fatDataProcessTrigers")
      .doc(context.params.documentId).update({"startTimeTemp": startTime}).then((writeResult) => {
        functions.logger.log("start time recorded2:", writeResult); ///
      });
          functions.logger.log("process started 3");
          // TimeOut start
          fatDataGetter(snap.data().fatDataId, snap.data().tableId).then((data) => {
              setTimeout(() => {
                admin.firestore().collection("A_companyData")
                .doc("Arizon12345")
                .collection("liveData2")
                .doc("Temp-probe1")
                    .onSnapshot((doc) => {
                    if (processIsRunning) {
                    functions.logger.log("time up", data.acceptance);
                    const timeCurrent2 = firestore.Timestamp.now();
                    admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId).update({
                      "observation": "Process has copleted in " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                    });
                functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                processIsRunning = false;
                return null;
                    }
                });
              }, data.acceptance*60*1000);
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
                  const timeCurrent = firestore.Timestamp.now();
                  const timeIntervalFor = fatData.acceptance;// acceptance is waittingtime
                  functions.logger.log("onSnapshot:timeInterval:", timeCurrent.seconds - startTime.seconds < timeIntervalFor*60,
                      "startTime:", startTime.seconds, "timeIntervalFor:", timeIntervalFor, "fatData:", fatData, "fatData.time:", fatData.acceptance);// acceptance is waittingtime
                  if ((doc.data().value === fatData.stop || doc.data().value < fatData.stop) && processIsRunning ||
                  (timeCurrent.seconds - startTime.seconds > timeIntervalFor*60 && processIsRunning)) { // this condition works
                    admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId).update({
                      "observation": "Process has copleted in " + (timeCurrent.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                    });
                    functions.logger.log("fatData:if: ", fatData);
                    processIsRunning = false;
                    resolve();
                  } else if (processIsRunning) {
                    admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId).update({
                      "observation": "process is running:- " + "Time remains: " + (timeIntervalFor*60 - (timeCurrent.seconds - startTime.seconds)) + " sec" + " Sensor value: " + doc.data().value,
                    });
                    functions.logger.log("fatData:else: ", fatData);
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
function fatDataGetter(fatId, tableId) {
  const data = admin.firestore()
      .collection("A_companyData")
      .doc("Arizon12345")
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
                .doc("Temp-probe1")
                    .onSnapshot((doc) => {
                    if (processIsRunning) {
                    functions.logger.log("time up", data.waitingTime);
                    const timeCurrent2 = firestore.Timestamp.now();
                    admin.firestore().collection("A_companyData")
                    .doc("Arizon12345")
                    .collection("fatData")
                    .doc(snap.data().fatDataId)
                    .collection("table")
                    .doc(snap.data().tableId).update({
                      "observation": "Wait function process has copleted in " + (timeCurrent2.seconds - startTime.seconds) + " sec" + " with value = " + doc.data().value,
                    });
                functions.logger.log("fatData:setTimeoutSuccessful: ", data);
                processIsRunning = false;
                return null;
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
                    // admin.firestore().collection("A_companyData")
                    // .doc("Arizon12345")
                    // .collection("fatData")
                    // .doc(snap.data().fatDataId)
                    // .collection("table")
                    // .doc(snap.data().tableId)
                    docRef.update({
                      "observation": " Condition Check has passed with value = " + doc.data().value,
                    });
                    }
                    else if(fatData.condition == 'less' && fatData.acceptanceValue < doc.data().value){
                     docRef.update({
                      "observation": " Condition Check has passed with value < " + doc.data().value,
                    });
                    }
                    else if(fatData.condition == 'great' && fatData.acceptanceValue > doc.data().value){  //keyword check in doc "great" need to change carefully and update here also if change happens
                     docRef.update({
                      "observation": " Condition Check has passed with value > " + doc.data().value,
                    });
                    }
                    else {
                     docRef.update({
                      "observation": " Condition Check has FAILED: value:-" + doc.data().value + " / " + fatData.acceptanceValue,
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
    