<h1 align="center">
  <picture>
    <!-- Dark mode logo -->
    <source 
      srcset="logoTextDark.png" 
      media="(prefers-color-scheme: dark)"
      width="300" 
      height="130"
    >
    <!-- Light mode logo -->
    <img 
      src="logoTextLight.png" 
      alt="Echo Logo" 
      width="300" 
      height="130"
    >
  </picture>
</h1>

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/Built_with-Rust-orange.svg)](https://www.rust-lang.org/)
[![WASM](https://img.shields.io/badge/Powered_by-WebAssembly-purple.svg)](https://webassembly.org/)

# What is Echo?

Echo is a secure chat app with a security protocol based on the [**Signal Protocol**](https://signal.org/docs/). Built with minimal external library use, all **Diffie Hellman Operations** including **Scalar Multiplication** are powered by our own Rust modules compiled with **WebAssembly** for the WebApp.

## Outsourced Cryptographic Functions
For the time being, the following cryptographic functionalities are handled by external crates:

Hash Key Derivation Function (HKDF)
→ hkdf

Montgomery Point and Scalar operations
→ curve25519-dalek


## Setup

Install [**Rustup**](https://rustup.rs/)

Install wasm-pack 
```bash
cargo install wasm-pack
```

Clone the project
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
Navigate and build the Rust Elliptic Curve Diffie-Hellman module
```
cd dh-wasm
wasm-pack build --target web
```
