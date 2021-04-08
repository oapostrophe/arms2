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
      var parameterName;
      var parameterValue;
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

      // Default size and pose
      var boxSize = "1 1 1";
      var pose = "0 0 0 0 0";

      // Loop over parameters, set size and pose if specified
      for(var param in parameters){
        if(param === "size"){
          boxSize = parameters[param];
        }
        if(param === "pose"){
          pose = parameters[param];
        }
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

      // Add box to threeJS scene
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
      const cube = new THREE.Mesh( geometry, material );
      scene.add( cube );

      // Set box position coordinates
      var coords = [];
      pose.split(" ").forEach(coord => {coords.push(parseInt(coord));});
      cube.position.set(coords[0], coords[1], coords[2]);
      //TODO: specify rotation from pose

      // Set box size
      var scales = [];
      boxSize.split(" ").forEach(scale => {scales.push(parseInt(scale));});
      cube.scale.set(scales[0], scales[1], scales[2]);


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

  // Output sdf
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
