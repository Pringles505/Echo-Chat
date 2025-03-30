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

Echo is an open-source, end-to-end encrypted chat app built with a security protocol inspired by the [**Signal Protocol**](https://signal.org/docs/). All cryptographic operations in Echo are powered by custom Rust modules developed from the ground up, the modules power all **X3DH**, **XEdDSA**, **AES-256** functions.

Developed by 2ºCEB students **Marcos Cabrero**, **Gonzalo de la Lastra**, and **Miguel Mascaró** at IMMUNE Institute of Technology.

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
## Building Rust Modules
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

Navigate and build the Rust XEdDSA Module
```
cd xeddsa-wasm
wasm-pack build --target web
```
