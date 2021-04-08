// Import parser
const arms = require("./arms-parser.js");

// Import threejs
import * as THREE from 'three';

// Declare document objects
var input = document.getElementById("input");
var display = document.getElementById("sdf");
var button = document.getElementById("compile");
var sceneContainer = document.getElementById("scene");
button.addEventListener("click", parseArms);

// Initialize threejs scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth/2, window.innerHeight/2 );
var domScene = sceneContainer.appendChild( renderer.domElement );
camera.position.set(4, 4, 8);

// Render threejs scene
function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}
animate();

// Parse input currently in textbox
function parseArms(){

  // Reset sdf
  var output = "";
  display.innerHTML = "";

  // Reset threejs scene
  scene.children.forEach(object => {
    object.material.dispose();
    object.geometry.dispose();
  });
  scene.clear();

  // Get new input
  var code = input.value;
  var tree = arms.parser.parse(code);
  
  // Initialize sdf world
  output += "&lt;?xml version=\"1.0\" ?&gt;\n"; // <?xml version = "1.0">
  output += "&lt;sdf version=\"1.4\"&gt;\n"; // <sdf version="1.4">
  output += "&lt;world name=\"simple_world\"&gt;\n\n"; // <world name="simple_world">

  // Create cursor for traversal
  let cursor = tree.cursor();

  // Enter program to first statement (assumes a statement exists)
  cursor.firstChild();

  // Parse all statements
  do {
    var statementReturn = parseStatement(cursor, code);
    if(statementReturn != -1){
      output += statementReturn;
    }
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

  // Output sdf
  display.innerHTML = output;
}


function parseStatement(cursor, code){

  // Get object name
  cursor.firstChild();
  var objectName = code.slice(cursor.from, cursor.to);
  if(cursor.name != "ObjectName"){
    console.log("Error parsing statement: expected ObjectName, got " + cursor.name);
    return -1;
  }
  
  // Get object value
  cursor.nextSibling();
  if(cursor.name != "ObjectVal"){
    console.log("Error parsing statement: expected ObjectVal, got " + cursor.name);
    return -1;
  }

  // Get object type
  if(!cursor.firstChild() || cursor.name != "ObjectType"){
    console.log("Errorparsing statement: expected ObjectType, got " + cursor.name);
    return -1;
  }
  var objectType = code.slice(cursor.from, cursor.to).toLowerCase();
  
  // Get any parameters
  var parameters = {};
  var parameterName;
  var parameterValue;
  while(cursor.nextSibling()){
    if(cursor.name != "Parameter"){
      console.log("parsing statement: expected Parameter, got " + cursor.name);
      return -1;
    }

    // Get parameter name
    cursor.firstChild();
    parameterName = code.slice(cursor.from, cursor.to).toLowerCase();

    // Get parameter value
    cursor.nextSibling();
    parameterValue = code.slice(cursor.from, cursor.to);

    // Add to dictionary and return to parent
    parameters[parameterName] = parameterValue;
    cursor.parent();
  }

  // Navigate back up to ObjectVal
  cursor.parent();
  // Navigate back up to Statement
  cursor.parent();

  // add Object
  return addObject(objectName, objectType, parameters);
}


function addObject(objectName, objectType, parameters={}){

  // Initialize variables
  var output = "";
  const definedTypes = new Set(["box", "sphere"]);
  var boxSize = (parameters["size"]) ? parameters["size"] : "1 1 1";
  var radius = (parameters["radius"]) ? parameters["radius"] : "1";
  var pose = (parameters["pose"]) ? parameters["pose"] : null;

  // Open model
  output += "&lt;model name=\"" + objectName + "\"&gt;\n"; // <model name="ObjectName">

  // Set pose if specified
  if(pose){
    output += "    &lt;pose&gt;" + pose + "&lt;/pose&gt;\n"; // <pose>
  }

  //Open link
  output += "    &lt;link name=\""+objectType+"\"&gt;\n"; // <link name = "box">

  // Only create geometries for defined types
  if(definedTypes.has(objectType)){
    
    // Open collision
    output += "        &lt;collision name=\"collision\"&gt;\n"; // <collision name="collision">
    output += "            &lt;geometry&gt;\n"; // <geometry>
    output += "                &lt;"+objectType+"&gt;\n"; // <box>

    // Set geometry-specific attributes
    if(objectType === "box"){
      output += "                    &lt;size&gt;" + boxSize + "&lt;/size&gt;\n"; // <size>1 1 1</size>
    }
    else if(objectType === "sphere"){
      output += "                    &lt;radius&gt;" + radius + "&lt;/radius&gt;\n"; // <radius>1</radius>
    }

    // Close collision
    output += "                &lt;/+"+objectType+"&gt;\n"; // </box>
    output += "            &lt;/geometry&gt;\n"; // </geometry>
    output += "        &lt;/collision&gt;\n"; // </collision>
    
    // Open visual
    output += "        &lt;visual name=\"visual\"&gt;\n"; // <visual name="visual">
    output += "            &lt;geometry&gt;\n"; // <geometry>
    output += "                &lt;"+objectType+"&gt;\n"; // <box>

    // Set geometry-specific attributes
    if(objectType === "Box"){
      output += "                    &lt;size&gt;" + boxSize + "&lt;/size&gt;\n"; // <size>1 1 1</size>
    }
    else if(objectType === "sphere"){
      output += "                    &lt;radius&gt;" + radius + "&lt;/radius&gt;\n"; // <radius>1</radius>
    }

    // Close visual
    output += "                &lt;/"+objectType+"&gt;\n"; // </box>
    output += "            &lt;/geometry&gt;\n"; // </geometry>
    output += "        &lt;/visual&gt;\n"; // </visual>
  }

  // Close link
  output += "    &lt;/link&gt;\n" // </link>

  // Closing </model> tag
  output += "&lt;/model&gt;\n\n";

  // Don't render objects of undefined types
  if(!definedTypes.has(objectType)){
    return output;
  }

  // Define object threeJS geometry
  var geometry;
  if(objectType === "box"){
    geometry = new THREE.BoxGeometry();
  }
  else if(objectType === "sphere"){
    geometry = new THREE.SphereGeometry(parseInt(radius));
  }

  // Add object to threeJs scene
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const tjsObject = new THREE.Mesh( geometry, material );
  scene.add(tjsObject);

  // Set coordinates if specified
  var coords = [];
  if(pose){
    pose.split(" ").forEach(coord => {coords.push(parseInt(coord));});
    tjsObject.position.set(coords[0], coords[1], coords[2]);
    //TODO: specify rotation from pose
  }

  // Set box size if specified
  if(objectType === "box"){
    var scales = [];
    boxSize.split(" ").forEach(scale => {scales.push(parseInt(scale));});
    tjsObject.scale.set(scales[0], scales[1], scales[2]);
  }

  return output;
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
