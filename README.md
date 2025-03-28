# Echo Chat App

Echo is a secure chat app with a security protocol based on the [**Signal Protocol**](https://signal.org/docs/). Built with minimum external library use, all **Diffie Hellman Operations** including **Scalar Multiplication** are powered by our own Rust modules compiled with **WebAssembly** for the WebApp.

#### Outsourced Cryptographic Functions
For the time being, the following cryptographic functionalities are handled by external crates:

Hash Key Derivation Function (HKDF)
→ hkdf

Montgomery Point and Scalar operations
→ curve25519-dalek


## Setup

Install [**Rustup**](https://rustup.rs/)

Clone the proyect
```bash
git clone https://github.com/Mascaro101/Echo-Chat-App
```
Install Dependencies
```
npm install
```
Navigate and build the Rust AES-256 module
```
cd aes-wasm
wasm-pack build --target web
```
Navigate and build the Rust Eliptic Curve Diffie-Hellman module
```
cd dh-wasm
wasm-pack build --target web
```
