// Import parser
const arms = require("./arms-parser.js");

// Import threejs
import * as THREE from 'three';
//TODO: fix orbitcontrols import
import * as OrbitControls from 'three/examples/js/controls/OrbitControls';

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

/*
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableKeys = false;
// this.controls.target.set(...DEFALUT_CAMERA_LOOKAT);
*/
// Render threejs scene
function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}
animate();


/**
 * Parse input currently in textbox
 */
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

  // Initialize any classes
  let cursor = tree.cursor();
  cursor.firstChild();
  var classes = getClasses(cursor, code);
  console.log(classes);

  // Reset cursor to first statement in program
  cursor = tree.cursor();
  cursor.firstChild();

  /*
  while(cursor.next()){
    console.log(cursor.name);
    console.log(code.slice(cursor.from, cursor.to));
  }
  */

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


/**
 * Get all user-defined classes in the program.
 * 
 * @param {*} cursor Cursor pointing to first statement in program
 * @param {*} code Full input code
 * @return Dictionary with all program classses.  Keys are class name, values are syntax node pointing to class parameters in lezer tree.
 */
function getClasses(cursor, code){
  var classes = {};

  // Loop over all statements
  do{

    // Check if statement defines a class
    cursor.firstChild();
    if(cursor.name == "ClassName"){

      // Log syntax node pointing to class parameters in dictionary
      var className = code.slice(cursor.from, cursor.to);
      cursor.nextSibling();
      classes[className] = cursor.node;
    }

    // Return to Statement
    cursor.parent();
  }
  while(cursor.nextSibling());

  return classes;
}


/**
 * Parses a single Statement
 * 
 * @param cursor Lezer parse tree cursor pointing to statement
 * @param code String with full text of code being parsed
 * @return String with sdf representing statement contents
 */
function parseStatement(cursor, code){
  var output = "";
  
  // Get model name
  if(!cursor.firstChild() | cursor.name != "ModelName"){
    console.log("Error parsing statement: expected Modelname, got " + cursor.name);
    return -1;
  }
  var modelName = code.slice(cursor.from, cursor.to);

  // Open model tag
  output += "&lt;model name=\"" + modelName + "\"&gt;\n"; // <model name="modelName">

  // Get Template
  if(!cursor.nextSibling() | cursor.name != "Type"){
    console.log("Error parsing statement: expected model Type, got " + cursor.name);
    return -1;
  }
  cursor.firstChild();
  var template = code.slice(cursor.from, cursor.to);

  // TODO: future use--specify other templates, put default in else case

  // Default to model
  
  // Get any SubStatements
  while(cursor.nextSibling()){
    var subStatementOutput = parseSubStatement(cursor, code);
    if(subStatementOutput != -1){
      output += subStatementOutput;
    }
  }

  // Return to top-level statement
  cursor.parent();

  // Closing </model> tag
  output += "&lt;/model&gt;\n\n";

  return output;
}


/**
 * Parses a single SubStatement
 * 
 * @param cursor cursor object from Lezer parse tree currently pointing at SubStatement to be parsed
 * @param code  full text of code being parsed
 * @return string with sdf output representing subStatement contents
 */
function parseSubStatement(cursor, code){
  cursor.firstChild();

  // Case when SubStatement is a model-wide parameter
  if(cursor.name === "Parameter"){
    // Get parameter name
    cursor.firstChild();
    var parameterName = code.slice(cursor.from, cursor.to).toLowerCase();

    // Get parameter value
    cursor.nextSibling();
    parameterValue = code.slice(cursor.from, cursor.to);

    // Return cursor to parameter
    cursor.parent();
    // Return cursor to SubStatement
    cursor.parent();

    return addParameter(parameterName, parameterValue);
  }

  // Case when SubStatement defines a child object
  else{

    // Get object name
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

    // Get object Template
    if(!cursor.firstChild() || cursor.name != "Template"){
      console.log("Error parsing statement: expected Template, got " + cursor.name);
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
    // Navigate back up to SubStatement
    cursor.parent();

    // add Object
    return addObject(objectName, objectType, parameters);

  }
}


/**
 * Generate SDF for a model-wide parameter
 * 
 * @param parameterName Name of parameter (string)
 * @param parameterValue Value of parameter (string)
 * @return String for parameter in SDF
 */
function addParameter(parameterName, parameterValue){

  // Model-wide pose
  if(parameterName.toLowerCase() == "pose"){
    return "    &lt;pose&gt;" + parameterValue + "&lt;/pose&gt;\n";
  }

  // Undefined parameter
  else{
    console.log("Skipping undefined parameter " + parameterName);
    return "";
  }
}


/**
 * Determine type for a single bject within model (joint, link, etc) and call appropriate function to generate sdf
 * 
 * @param {*} objectName 
 * @param {*} objectType 
 * @param {*} parameters 
 */
function addObject(objectName, objectType, parameters={}){

  const jointTypes = new Set(["fixed"]);
  if(jointTypes.has(objectType)){
    return addJoint(objectName, objectType, parameters);
  }
  else{
    return addLink(objectName, objectType, parameters);
  }

}

/**
 * Generates SDF for a single joint 
 * 
 * @param {*} objectName 
 * @param {*} objectType 
 * @param {*} parameters 
 */
function addJoint(objectName, objectType, parameters={}){

  // Initialize variables
  var pose = (parameters["pose"]) ? parameters["pose"] : null;
  var output = "";

  // Check for necessary parameters (parent and child)
  if(!parameters["parent"] || !parameters["child"]){
    console.log("Error adding joint: parent or child not specified!");
    return -1;
  }

  // Open joint
  output += "    &lt;joint name=\""+objectName+"\" type=\""+objectType+"\"&gt;\n"; // <joint name = "name" type="fixed">

  // Set pose if specified
  if(pose){
    output += "        &lt;pose&gt;" + pose + "&lt;/pose&gt;\n"; // <pose>
  }

  // Add parent
  output += "        &lt;parent&gt;"+parameters["parent"]+"&lt;/parent&gt;\n"; // <parent>name</parent>

  // Add child
  output += "        &lt;child&gt;"+parameters["child"]+"&lt;/child&gt;\n"; // <child>name</child>

  // Close joint
  output += "    &lt;/joint&gt;\n" // </joint>

  return output;
}


/**
 * Generates SDF for a single object within a model (link, joint, etc)
 * @param {*} objectName 
 * @param {*} objectType 
 * @param {*} parameters 
 */
function addLink(objectName, objectType, parameters={}){

  // Initialize variables
  var output = "";
  const linkTypes = new Set(["box", "sphere"]);
  var boxSize = (parameters["size"]) ? parameters["size"] : "1 1 1";
  var radius = (parameters["radius"]) ? parameters["radius"] : "1";
  var pose = (parameters["pose"]) ? parameters["pose"] : null;

  //Open link
  output += "    &lt;link name=\""+objectName+"\"&gt;\n"; // <link name = "box">

  // Set pose if specified
  if(pose){
    output += "    &lt;pose&gt;" + pose + "&lt;/pose&gt;\n"; // <pose>
  }

  // Create geometries for defined link types
  if(linkTypes.has(objectType)){
    
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
    output += "                &lt;/"+objectType+"&gt;\n"; // </box>
    output += "            &lt;/geometry&gt;\n"; // </geometry>
    output += "        &lt;/collision&gt;\n"; // </collision>
    
    // Open visual
    output += "        &lt;visual name=\"visual\"&gt;\n"; // <visual name="visual">
    output += "            &lt;geometry&gt;\n"; // <geometry>
    output += "                &lt;"+objectType+"&gt;\n"; // <box>

    // Set geometry-specific attributes
    if(objectType === "box"){
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

  // Don't render undefined link types
  if(!linkTypes.has(objectType)){
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
