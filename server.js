//WEB RTC SIGNALLING SERVER 
// using sockets
const express = require('express');
    const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
var WebSocketServer = require('ws').Server; 
var wss = new WebSocketServer({ server }); 

//List of active users and their connection statuses
var users = {};
var connections = {};
  
wss.on('connection', function(connection) {
    console.log("Connected");
	
    //when server gets a message from a connected user
    connection.on('message', function(message) { 
        var data; 
        // validate JSON
        try {
            data = JSON.parse(message); 
        } catch (e) { 
            console.log("Invalid JSON"); 
            data = {}; 
        } 
		
      //Determine the type of user request
      switch (data.type) { 
			case "login": 
				console.log("Conected", data.name); 
				
				if(users[data.name]) { 
					prepareMessage(connection, {type: "login", response: false }); 
				} else { 
					//save user connection on the server 
					users[data.name] = connection; 
					connections[data.name] = false; 
					connection.name = data.name; 
					prepareMessage(connection, { type: "login", response: true  }); 
				} 
				
            break; 
				
            case "offer": 
                console.log("Sending offer to: ", data.name); 
                    
                // if requested user is already in a chat
                var conn = users[data.name];
                if (connections[data.name] || connections[connection.name] ) {
                    conn = users[connection.name];
                    prepareMessage(conn, {type: "engaged", engaged: data.name}); 
                //send offer if user is available
                } else if(conn != null) { 
                    console.log("Verifying offer to: ", data.name); 
                    connection.otherName = data.name; 
                    connections[data.name] = !connections[data.name];
                    connections[connection.name] = !connections[connection.name];
                    prepareMessage(conn, { type: "offer", offer: data.offer, name: connection.name }); 
                // NO such user exists
                } else {
                    conn = users[connection.name];
                    prepareMessage(conn, { type: "reject", reject: data.name}); 
                }
                break;  
                    
            case "answer": 

                var conn = users[data.name]; 
                console.log("aNS sENT tO: ", data.name); 
                console.log(connection.name, data.name);
                if(conn != null) { 
                    connection.otherName = data.name; 
                    prepareMessage(conn, { type: "answer", answer: data.answer }); 
                }  
                break;  
                    
            case "candidate": 
                console.log("Candidate to :",data.name); 
                var conn = users[data.name];  
                    
                if(conn != null) { 
                    prepareMessage(conn, {type: "candidate", candidate: data.candidate});
                } 
                break;  
                    
            case "leave": 
                console.log("Good Bye", data.name); 
                var conn = users[data.name]; 
                conn.otherName = null;
                connections[data.name] = null;
                connections[connection.name] = null;
                    
                //kick other user
                if(conn != null) { 
                    prepareMessage(conn, {type: "leave"}); 
                }  
                break;  
                    
            default: 
                prepareMessage(connection, { type: "error", message: "Command not found: " + data.type }); 
                break; 
        }  
    });  
	

    connection.on("close", function() { 
        if(connection.name) { 
            delete users[connection.name]; 
            if(connection.otherName) { 
                console.log("Disconnecting from ", connection.otherName);
                var conn = users[connection.otherName]; 
                if(conn.otherName) {
                    conn.otherName = null;  
                }
            if(conn != null) { 
                prepareMessage(conn, {type: "leave"});
            }  
        } 
        } 
    });  
	
    connection.send("{}"); 
	
});  

function prepareMessage(connection, message) { 
    connection.send(JSON.stringify(message)); 
}
