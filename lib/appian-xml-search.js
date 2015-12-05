$(function () {
  // var util = require('util');
  var JSZip = require('jszip');
  var Papa = require('papaparse');
  var Blob = require('blob');
  var parseString = require('xml2js').parseString;

  var csvResults = {
    fields: ["Object Name", "UUID", "Type", "File", "Snippet"],
    data: []
  };
  var searchFor;


  function getFileInfo(zipFile) {
    var subfolder = zipFile.name.substring(0,zipFile.name.indexOf("/"));
    var fileText = zipFile.asText();
    var name, uuid;

    switch(subfolder) {
      case 'content':
      name = "Content"; 
      uuid = zipFile.name.substring(zipFile.name.indexOf("/")+1);

      parseString(fileText, function (err, fileJson) {
        if(!fileJson) {
          name = "Document"; 
          var first = zipFile.name.indexOf("/");
          uuid = zipFile.name.substring(first+1,zipFile.name.indexOf("/",first+1));

        } else if(fileJson['contentHaul']) {
          name = fileText.substring(fileText.indexOf("<name>")+6,fileText.indexOf("</name>"));
          uuid = fileText.substring(fileText.indexOf("<uuid>")+6,fileText.indexOf("</uuid>"));
        }
      });
      break;
      case 'processModel':
      name = "ProcessModel"; 
      parseString(fileText, function (err, fileJson) {
        if(fileJson && fileJson['processModelHaul']) {
          name = searchJsonForProperty(fileJson,'processModelHaul.process_model_port[0].pm[0].meta[0].name[0].string-map[0].pair[0].value[0]');
          uuid = searchJsonForProperty(fileJson,'processModelHaul.process_model_port[0].pm[0].meta[0].uuid');
        }
      });
      break;
      default:
      name = "Other"; 
      uuid = zipFile.name.substring(zipFile.name.indexOf("/")+1);
    }

    return [name, uuid, subfolder, zipFile.name];
  }

  function searchJsonForProperty(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      if (k in o) {
        o = o[k];
      } else {
        return;
      }
    }
    return o;
  }

  function searchForTextAndSave(searchWithin, searchFor, fileInfo) {
    var regexp = new RegExp(searchFor, "g");
    var match;

    console.log("Scanning: " + fileInfo);

    while ((match = regexp.exec(searchWithin)) != null) {
      csvResults.data.push(fileInfo.concat(searchWithin.substring(match.index-150, match.index+150)));
    }

  }

  function runScan(file, searchFor) {
    var deferred = $.Deferred();

    setTimeout(function(){
      var zip = new JSZip(file); 

      $.each(zip.files, function (key, zipEntry) {
        // Skip non-xml files
        if(zipEntry.name.slice(zipEntry.name.lastIndexOf("."))===".xml") {

          var fileInfo = getFileInfo(zipEntry);
          searchForTextAndSave(zipEntry.asText(), searchFor, fileInfo);
        }
      });
      console.log("Scan complete..");

      deferred.resolve('Success');
    }, 100);

    return deferred.promise();
  }

  function loadFile(file) {
    var reader = new FileReader();
    var deferred = $.Deferred();

    reader.onload = function(event) {
      deferred.resolve(event.target.result);
    };

    reader.onerror = function() {
      showError("An unexpected error has occurred.");
      deferred.reject(this);
    };

    reader.readAsArrayBuffer(file);

    return deferred.promise();
  }

  function saveToDownloadFile(text) {
    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "appian-zip-diff-results.csv");
  }

  function showError(text) {
    $("#appian-xml-search #error").text(text);
    $("#appian-xml-search #error").removeClass('hidden');
  }

  function hideError() {
    $("#appian-xml-search #error").addClass('hidden');
  }

  function showWaiting() {
    $("#appian-xml-search #searchFile").addClass('disabled');
    $("#appian-xml-search #searchText").addClass('disabled');
    $("#appian-xml-search #searchButton").addClass('disabled');
    $("#appian-xml-search #waiting").removeClass('hidden');
  }

  function hideWaiting() {
    $("#appian-xml-search #waiting").addClass('hidden');
    $("#appian-xml-search #searchFile").removeClass('disabled');
    $("#appian-xml-search #searchText").removeClass('disabled');
    $("#appian-xml-search #searchButton").removeClass('disabled');
  }

  $("#appian-xml-search #searchButton").click(function(evt) {
    hideError();
    var input = $("#appian-xml-search #searchFile").get(0);
    var file = input.files[0];
    var searchFor = $('#appian-xml-search #searchText').val();

    if(!$("#appian-xml-search #searchFile").val()) {
      showError("Please upload a file.");
    }
    else if(file.name.slice(file.name.lastIndexOf("."))!==".zip") {
      showError("Please upload a Appian zip file.");
    }
    else if(!searchFor) {
      showError("Please enter some text before searching.");
    } else {
      showWaiting();
      var loadingFile = loadFile(file);        

      loadingFile
      .done(function (file) {
        var runningScan = runScan(file, searchFor);  

        runningScan
        .done(function () {
          console.log("Inspection Complete; Generating file..");
          var csvText = Papa.unparse(csvResults);
          saveToDownloadFile(csvText);
        })
        .fail(function () {
          showError("An unexpected error occurred.");
        })
        .then(function (){
          hideWaiting();
        })

      })
      .fail(function () {
        showError("An unexpected error occurred.");
      })
    }
  });


});


