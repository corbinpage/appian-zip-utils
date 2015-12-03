$(function () {
  // var fs = require('fs');
  // var babyParse = require('babyParse');
  // var JSZip = require('jszip');
  // var _ = require('underscore');
  // var util = require('util');
  // var parseString = require('xml2js').parseString;

  var findText = "@mlp";
  var outputFile = 'outputDev.txt';
  var csvResults = {
    fields: ["Object Name", "UUID", "Type", "File", "Snippet"],
    data: []
  };


  function inspectZipFile(zipFile) {
    var subfolder = zipFile.name.substring(0,zipFile.name.indexOf("/"));
    var fileText = zipFile.asText();
    var name, uuid;

    console.log("Inspecting: " + zipFile.name);

    switch(subfolder) {
      case 'content':
      parseString(fileText, function (err, fileJson) {
        // if err throw err;

        name = "Other"; 
        uuid = zipFile.name.substring(zipFile.name.indexOf("/")+1);

        if(!fileJson) {
          name = "Document"; 
          var first = zipFile.name.indexOf("/");
          uuid = zipFile.name.substring(first+1,zipFile.name.indexOf("/",first+1));

        } else if(fileJson['contentHaul']) {
          name = fileText.substring(fileText.indexOf("<name>")+6,fileText.indexOf("</name>"));
          uuid = fileText.substring(fileText.indexOf("<uuid>")+6,fileText.indexOf("</uuid>"));
        }

        searchForTextAndSave(fileText, [name, uuid, subfolder, zipFile.name]);
      });   
      break;

      case 'processModel':
      name = "ProcessModel"; 
      parseString(fileText, function (err, fileJson) {

        if(fileJson && fileJson['processModelHaul']) {
          name = searchJsonForProperty(fileJson,'processModelHaul.process_model_port[0].pm[0].meta[0].name[0].string-map[0].pair[0].value[0]');
          uuid = searchJsonForProperty(fileJson,'processModelHaul.process_model_port[0].pm[0].meta[0].uuid');
        }

        searchForTextAndSave(fileText, [name, uuid, subfolder, zipFile.name]);
      });   
      break;

      case 'META-INF':

      break;

      default:
      name = "Other"; 
      uuid = zipFile.name.substring(zipFile.name.indexOf("/")+1);

      searchForTextAndSave(fileText, [name, uuid, subfolder, zipFile.name]);
    }

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

  function searchForTextAndSave(searchWithin, fileInfo) {
    var regexp = new RegExp(findText, "g");
    var match;

    while ((match = regexp.exec(searchWithin)) != null) {
      csvResults.data.push(fileInfo.concat(searchWithin.substring(match.index-150, match.index+150)));
    }
  }

  function run(file) {
    var reader = new FileReader();
    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        try {
          var zip = new JSZip(e.target.result); 

          console.log("JZip success");
          $.each(zip.files, function (zipEntry) {
            console.log("here");
            // inspectZipFile(zipEntry);
          });

          // fs.writeFileSync("outputTest.csv", babyParse.unparse(csvResults))

        } catch(e) {
          var $fileContent = $("<div>", {
            "class" : "alert alert-danger",
            text : "Error reading " + theFile.name + " : " + e.message
          });
        }
      }
    })(file);

    reader.readAsArrayBuffer(file);
  }

  $("#appian-xml-search #searchButton").click(function(evt) {
    var input = $("#appian-xml-search #searchFile").get(0);
    var file = input.files[0];

    if(!$("#appian-xml-search #searchFile").val()) {
      console.log("No file uploaded.");

        // Check if file isn't a zip
        // Check if text has been entered
        // run
        // }
        // else if(file.name.slice(file.name.lastIndexOf("."))!==".zip") {
        //   console.log('Not a Zip file');
      } else {
        run(file);        
      }

    });

});


