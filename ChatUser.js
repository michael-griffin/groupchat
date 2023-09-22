"use strict";

/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "get-joke") this.handleJoke();
    else if (msg.type === "get-members") this.handleList();
    else if (msg.type === "chat") this.handleChat(msg.text);
    else if (msg.type === "private-chat") this.handlePriv(msg.text);
    else if (msg.type === "name-change") this.handleNameChange(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  handleNameChange(text) {
    const [cmd, newName] = text.split(" ");

    this.room.updateUser(newName, this)


  }


  handlePriv(text) {
    const [cmd, user, ...msg] = text.split(" ");

    const message = msg.join(" ");

    const data = {
      name: this.name,
      type: "chat",
      text: message,
    };



    this.room.privateMsg(data, user);
  }

  handleList() {
    this.room.listMembers(this);
  }

  async handleJoke() {

    let resp = await fetch('https://icanhazdadjoke.com/', {
      headers: { "Accept": "application/json" }
    });
    let parsed = await resp.json();
    let dadJoke = parsed.joke;
    console.log(parsed);

    // let simpleJoke = `I hired a lawyer to sue the airlines for mishandling my luggage
    // They lost the case`;
    this.room.private({
      name: this.name,
      type: "chat",
      text: dadJoke,
    }, this);
  }
  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
