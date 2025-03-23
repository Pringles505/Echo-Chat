# Echo Chat App

Echo is a secure chat app with a security protocol based on the [**Signal Protocol**](https://signal.org/docs/). Built with minimum external library use, all **Diffie Hellman Operations** including **Scalar Multiplication** are powered by our own Rust modules compiled with **WebAssembly** for the WebApp.

## Setup

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
