//our username and tracker variables
var name; 
var connectedUser;
var clientConnection; 
var stream;
  
//connecting to our signaling server
var server = new WebSocket('ws://localhost:9090');
  
server.onopen = function () { 
   console.log("Connected"); 
};
  
server.onmessage = function (msg) { 
   console.log("Got message", msg.data);
	
   var data = JSON.parse(msg.data); 
   var data; 
       try {
           data = JSON.parse(msg.data); 
       } catch (e) { 
           console.log("Invalid JSON"); 
           data = {}; 
       } 
	//depending on server response select right action
    switch(data.type) { 
        case "login": 
            serverConnect(data.response); 
            break; 
        case "offer": 
            processOffer(data.offer, data.name); 
            break; 
        case "answer": 
            processAnswer(data.answer); 
            break; 
        //ICE REQUEST 
        case "candidate": 
            processICECandidate(data.candidate); 
            break; 
        case "leave": 
            terminateConn(); 
            break; 
        case "reject": 
            alert(`User: ${data.reject} is not online`);
            break; 	
        case "engaged": 
            alert(`User: ${data.engaged} is not available`);
            break; 
        default: 
            break; 
   }
};
  
server.onerror = function (err) { 
   alert("An Error occurred while communicating with the server", err); 
};
  

function prepareMessage(message) { 
    // JSON message and add reciepent name
    if (connectedUser) { 
        message.name = connectedUser; 
    }
    server.send(JSON.stringify(message)); 
};

document.querySelector('#videoChat').style.display = "none";

// Login when the user clicks the button 
document.querySelector('#signIn').addEventListener("click", function (event) { 
    name = loginInput.value;
    //send login request to server
    if (name.length > 0) { 
        prepareMessage({type: "login", name: name}); 
    }
});
  
function serverConnect(response) { 
    if (!response) { 
        alert("User already connected"); 
    } else { 
        document.querySelector('#loginPage').style.display = "none"; 
        document.querySelector('#videoChat').style.display = "block";
        // GET AUDIO/VIDE0 feed from user
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function (myStream) { 
            stream = myStream; 
            document.querySelector('#local').src = window.URL.createObjectURL(stream);
			
            // Google public stun server
            // STUN servers are used by both clients to determine their IP address as visible by the global 
            // STUN needed when peers are on different networks.
            var configuration = { "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]}; 
            
			//setup and init the RTC stream
            clientConnection = new RTCPeerConnection(configuration); 
            clientConnection.addStream(stream); 
			
            clientConnection.onaddstream = function (e) { 
                //CHROME SUPPORT process incoming video stream
                document.querySelector('#remote').src = window.URL.createObjectURL(e.stream); 
            };
            clientConnection.ontrack = function (e) { 
                ///FIREFOX SUPPORT process incoming video stream
                document.querySelector('#remote').src = window.URL.createObjectURL(e.stream); 
            };
			
            //Setup ICE handling
            clientConnection.onicecandidate = function (e) { 
                if (e.candidate) { 
                    prepareMessage({type: "candidate", candidate: e.candidate}); 
                } 
            };  
			
        }, function (error) { 
            alert(error); 
        }); 
		
    } 
};
  

document.querySelector('#connect').addEventListener("click", function () { 
    var otherUser = document.querySelector('#otherUser').value;
    console.log("click offer", otherUser);
    if (otherUser.length > 0) { 
        connectedUser = otherUser;
        // create offer to connect to other user 
        //update local condition
        clientConnection.createOffer(function (offer) { 
            prepareMessage({type: "offer", offer: offer}); 
            clientConnection.setLocalDescription(offer); 
        }, function (error) { 
            alert("Error when attempting to place the call"); 
        });
    } 
});
  
function processOffer(offer, name) { 
    connectedUser = name; 
    //accept offer
    clientConnection.setRemoteDescription(new RTCSessionDescription(offer));
    clientConnection.createAnswer(function (answer) { 
        clientConnection.setLocalDescription(answer); 
        console.log(answer);
        prepareMessage({type: "answer", answer: answer }); 
    }, function (error) { 
        alert("Unable to connect to incoming Video Call"); 
    }); 
};
  

function processAnswer(answer) { 
    //process other user's response
    clientConnection.setRemoteDescription(new RTCSessionDescription(answer)); 
};
  
function processICECandidate(candidate) { 
    //process ICE Candidate when recieved from other user
    clientConnection.addIceCandidate(new RTCIceCandidate(candidate)); 
};
   
//terminate videochat 
document.querySelector('#disconnect').addEventListener("click", function () { 
    prepareMessage({type: "leave" });  
	terminateConn(); 
});
  
function terminateConn() { 
    // clear all variables 
    connectedUser = null; 
    document.querySelector('#remote').src = null; 
    clientConnection.close(); 
    clientConnection.onicecandidate = null; 
    clientConnection.onaddstream = null;
    clientConnection.ontrack = null;
    document.querySelector('#loginPage').style.display = "block"; 
    document.querySelector('#videoChat').style.display = "none";
};