Sekreter
========

Yet another text encoder/decoder
This one uses no serverside at all, no data transfer, just you and your browser.
(you can even host it local and it works or use it without connection)

Uses [AES-CBC](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation) encryption method

## How to use
### For cold storage
```mermaid
flowchart TD
    A(["Start"]) --> n1["Define key and sekret"]
    n1 --> n2["Save or memorize key and sekret"]
    n2 --> n3["Set text to encrypt and hit encrypt"]
    n3 --> n4["Store hash (print it, save it into a chat, twit it...)"]
    n4 --> n5["Whenever you need to decrypt<br>just input hash, key and sekret.<br>Then just hit decrypt"]
    n5 --> n6(["End"])
```

### Sharing keys to another user
```mermaid
sequenceDiagram
  actor Alice as Alice
  actor Bob as Bob
  rect rgb(191, 223, 255)
    Alice <<->> Bob: Both define Key and Sekret
  end
  Note over Alice: Define text to encrypt
  Note over Alice: Hit encrypt and copy hash
  Alice ->> Bob: Send hash to Bob
  Note over Bob: Paste hash and hit decrypt
```

### Using p2p
```mermaid
sequenceDiagram
  actor Alice as Alice
  actor Bob as Future Alice
  rect rgb(191, 223, 255)
    Alice <<->> Bob: Both set remote option
  end
  Alice ->> Bob: Send local ID
  Note over Bob: Paste ID into remote field
  Note over Bob: Hit connect
  rect rgb(191, 223, 255)
    Alice <<->> Bob: Both sessions are now connected
  end
  Note over Alice: Define text to encrypt
  Note over Alice: Define Key and Sekret
  Note over Alice: Hit encrypt
  rect rgb(191, 223, 255)
    Alice <<->> Bob: Everytime "encrypt" is hit,<br>Key and sekret are sync<br>between sessions
  end
  Alice ->> Bob: Send hash to Bob
  Note over Bob: Paste hash and hit decrypt
```

## Changelog
- **1.0.2** - Add (optional) Peer to Peer support for easier way to share sekrets between two computers.  
This uses [peerjs](https://peerjs.com/) public server only for handling handshake, then all communications are P2P.  
- **1.0.1** - some minor patches  
- **1.0.0** - First release with mobile friendly and offline support
