// Import parser
const arms = require("./arms-parser.js");

// Declare document objects
var input = document.getElementById("input");
var display = document.getElementById("sdf");
var button = document.getElementById("compile");
button.addEventListener("click", parseArms);
var output = "";

// Parse input currently in textbox
function parseArms(){
  output = "";
  display.innerHTML = "";
  code = input.value;
  tree = arms.parser.parse(code);

  // Initialize sdf world
  output += "&lt;?xml version=\"1.0\" ?&gt;\n"; // <?xml version = "1.0">
  output += "&lt;sdf version=\"1.4\"&gt;\n"; // <sdf version="1.4">
  output += "&lt;world name=\"simple_world\"&gt;\n\n"; // <world name="simple_world">

  // Create cursor for traversal
  let cursor = tree.cursor();

  // Enter program to first statement (assumes a statement exists)
  cursor.firstChild();

  do {

    // Go to object name
    cursor.firstChild();
    var nodeType = cursor.name;
    var nodeValue = code.slice(cursor.from, cursor.to);
    // Open model
    output += "&lt;model name=\"" + nodeValue + "\"&gt;\n"; // <model name="ObjectName">
    
      
    // Get object value
    cursor.nextSibling();

    // Get object type
    if(!cursor.firstChild() || cursor.name != "ObjectType"){
      console.log("Error: expected ObjectType");
    }
    nodeValue = code.slice(cursor.from, cursor.to);
    

    // Create Box
    if(nodeValue === "Box"){

      // Get any parameters
      var parameters = {};
      while(cursor.nextSibling()){
        nodeType = cursor.name;
        if(nodeType != "Parameter"){
          console.log("Error: expected Parameter");
        }

        // Get parameter name
        cursor.firstChild();
        parameterName = code.slice(cursor.from, cursor.to);

        // Get parameter value
        cursor.nextSibling();
        parameterValue = code.slice(cursor.from, cursor.to);

        // Add to dictionary and return to parent
        parameters[parameterName] = parameterValue;
        cursor.parent();

      }

      // Default size
      boxSize = "1 1 1";
      pose = "0 0 0";

      // Loop over parameters, log and set size and pose if specified
      for(var param in parameters){
        if(param === "size"){
          boxSize = parameters[param];
          console.log("Changed box size");
        }
        if(param === "pose"){
          pose = parameters[param];
          console.log("Changed pose");
        }
        console.log("Parameter:" + param + "=" + parameters[param]);
      }

      // Set model pose if present
      if(parameters["pose"]){
        output += "    &lt;pose&gt;" + pose + "&lt;/pose&gt;\n" // <pose>
      }

      //Open link
      output += "    &lt;link name=\"Box\"&gt;\n"; // <link name = "Box">

      // Create collision
      output += "        &lt;collision name=\"Collision\"&gt;\n"; // <collision name="collision">
      output += "            &lt;geometry&gt;\n"; // <geometry>
      output += "                &lt;box &gt;\n"; // <box>
      output += "                    &lt;size&gt;" + boxSize + "&lt;/size&gt;\n"; // <size>boxSize</size>
      output += "                &lt;/box &gt;\n"; // </box>
      output += "            &lt;/geometry&gt;\n"; // </geometry>
      output += "        &lt;/collision&gt;\n"; // </collision>
      
      // Create visual
      output += "        &lt;visual name=\"visual\"&gt;\n"; // <visual name="visual">
      output += "            &lt;geometry&gt;\n"; // <geometry>
      output += "                &lt;box &gt;\n"; // <box>
      output += "                    &lt;size&gt;" + boxSize + "&lt;/size&gt;\n"; // <size>1 1 1</size>
      output += "                &lt;/box &gt;\n"; // </box>
      output += "            &lt;/geometry&gt;\n"; // </geometry>
      output += "        &lt;/visual&gt;\n"; // </visual>


      // Close link
      output += "    &lt;/link&gt;\n" // </link>
    }

    // Closing </model> tag
    output += "&lt;/model&gt;\n\n";

    // Navigate back up to ObjectVal
    cursor.parent();
    // Navigate back up to Statement
    cursor.parent();

  }
  while (cursor.nextSibling());

  // Add ground plane
  output += "&lt;model name=\"ground\"&gt;\n"; // <model name="ground">
  output += "&lt;static&gt;true&lt;/static&gt;\n"; // <static>true</static>
  output += "&lt;link name=\"ground_link\"&gt;\n"; // <link name="ground link">
  output += "&lt;collision name=\"collision1\"&gt;\n"; // <collision name="collision1">
  output += "&lt;geometry&gt;&lt;plane&gt;\n"; // <geometry><plane>
  output += "&lt;normal&gt;0 0 1&lt;/normal&gt;\n"; // <normal>0 0 1</normal>
  output += "&lt;/plane&gt;&lt;/geometry&gt;\n"; // </plane></geometry>
  output += "&lt;/collision&gt;\n"; // </collision>
  output += "&lt;visual name=\"visual1\"&gt;\n"; // <visual name="visual1">
  output += "&lt;geometry&gt;&lt;plane&gt;\n"; // <geometry><plane>
  output += "&lt;normal&gt;0 0 1&lt;/normal&gt;\n"; // <normal>0 0 1</normal>
  output += "&lt;size&gt;100 100&lt;/size&gt;\n"; // <size>100 100</size>
  output += "&lt;/plane&gt;&lt;/geometry&gt;\n"; // </plane></geometry>  
  output += "&lt;/visual&gt;\n"; // </visual>
  output += "&lt;/link&gt;\n"; // </link>
  output += "&lt;/model&gt;\n" // </model>

  // Close world and sdf tags
  output += "\n&lt;/world&gt;" // </world>
  output += "\n&lt;/sdf&gt;" // </sdf>

  display.innerHTML = output;
}


/*

// Initialize parser for codemirror integration
import {parser} from "./arms-parser.js"
import {foldNodeProp, foldInside, indentNodeProp} from "@codemirror/language"
import {styleTags, tags as t} from "@codemirror/highlight"

let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      ObjectName: t.variableName,
      string: t.string
      // May have one for matching parentheses/braces, see documentation
    })
    // Note: tutorial had more for folding indentation etc
  ]
})

// Initialize editor
import {EditorState, EditorView, basicSetup} from "@codemirror/basic-setup"

let view = new EditorView({
  state: EditorState.create({extensions: [basicSetup ]}),
  parent: document.body
})

import {LezerLanguage} from "@codemirror/language"

export const exampleLanguage = LezerLanguage.define({
  parser: parserWithMetadata,
  languageData: {
    // delete?
  }
})

// May not be necessary, export for additional module stuff
import {LanguageSupport} from "@codemirror/language"

export function example() {
  return new LanguageSupport(exampleLanguage, [exampleCompletion])
}

//TODO: AUTOCOMPLETION
*/
