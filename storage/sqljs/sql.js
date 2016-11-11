
module.exports = function(RED) {
    "use strict";
    var reconnect = RED.settings.sqliteReconnectTime || 20000;
    var SQL = require('sql.js');
    var fs = require('fs');

    function SqljsNodeDB(n) {
        RED.nodes.createNode(this,n);

        this.dbname = n.db;
        var node = this;

        node.doConnect = function() {
            var filebuffer=null;
            try{
                filebuffer =fs.readFileSync(node.dbname);
                node.db = new SQL.Database(filebuffer);
                if (node.tick) { clearTimeout(node.tick); }
                node.log("opened "+node.dbname+" ok");            }
            catch(err){
                node.error("failed to open "+node.dbname, err);
                node.tick = setTimeout(function() { node.doConnect(); }, reconnect);
            }
        }

        node.on('close', function () {
            if (node.tick) { clearTimeout(node.tick); }
            if (node.db) { node.db.close(); }
        });
    }
    RED.nodes.registerType("sqljsdb",SqljsNodeDB);

    function SqljsNodeIn(n) {
        RED.nodes.createNode(this,n);
        this.mydb = n.mydb;
        this.mydbConfig = RED.nodes.getNode(this.mydb);

        if (this.mydbConfig) {
            this.mydbConfig.doConnect();
            var node = this;
            node.on("input", function(msg) {
                if (typeof msg.topic === 'string') {
                    //console.log("query:",msg.topic);
                    var bind = Array.isArray(msg.payload) ? msg.payload : [];
                    node.mydbConfig.db.all(msg.topic, bind, function(err, row) {
                        if (err) { node.error(err,msg); }
                        else {
                            msg.payload = row;
                            node.send(msg);
                        }
                    });
                }
                else {
                    if (typeof msg.topic !== 'string') {
                        node.error("msg.topic : the query is not defined as a string",msg);
                    }
                }
            });
        }
        else {
            this.error("Sqlite database not configured");
        }
    }
    RED.nodes.registerType("sqlite",SqljsNodeIn);
}
