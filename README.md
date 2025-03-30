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

## Table of Contents  
- [Security Protocol](#security-protocol)  
  - [X3DH (Extended Triple Diffie-Hellman)](#x3dh-extended-triple-diffie-hellman)  
  - [XEdDSA (EdDSA for X25519)](#xeddsa-eddsa-for-x25519)  
- [Setup](#setup)  
- [References](#references)  

# Security Protocol

## **X3DH (Extended Triple Diffie-Hellman)**
X3DH is a key agreement protocol used to establish a shared secret between two parties (e.g., Alice and Bob) using public-key cryptography. It ensures **forward secrecy** and **deniability**.

### **Key Exchange Process**
1. **Public Key Components**:
   - Each user has:
     - **Identity Key (IK)**: Long-term key pair for authentication.
     - **Signed Prekey (SPK)**: Short-term key signed by `IK`, rotated periodically.
     - **One-Time Prekeys (OPK)**: Optional single-use keys for forward secrecy.

2. **Key Exchange Steps**:
   - Alice fetches Bob’s prekeys (`IK_B`, `SPK_B`, `OPK_B`).
   - Alice verifies `SPK_B`’s signature using `IK_B` (via **XEdDSA**).
   - Alice performs **three DH operations**:
     ```python
     DH1 = DH(IK_A, SPK_B)       # Alice-Identity and Bob-SignedPreKey
     DH2 = DH(EK_A, IK_B)        # Alice-Ephemeral and Bob-Identity
     DH3 = DH(EK_A, SPK_B)       # Alice-Ephemeral and Bob-SignedPreKey
     DH4 = DH(EK_A, OPK_B)       # Alice-Epehemeral and Bob-OneTimeKey
     ```
   - The shared secret is derived as:
     ```python
     SK = KDF(DH1 || DH2 || DH3 || DH4)
     ```
---
## **XEdDSA (EdDSA for X25519)**
XEdDSA is a signature scheme based on the Edwards-curve digital signature algorithm (EdDSA). EdDSA is designed for Twisted-Edwards curves, however, since we use curve X25519 elliptic-curve for the diffie-hellman operations, keys are in Montgomery form so we must convert them into Edwards form and compute EdDSA. This preconversion of the input from Montgomery form to Edwards form is the key distinction of XEdDSA.
### **How It Works**
#### **Key Terminology**
| Term         | Description                                                                 | Curve Form       |
|--------------|-----------------------------------------------------------------------------|------------------|
| `xPrivKey`   | X25519 private key (32-byte scalar)                                         | Montgomery       |
| `xPubKey`    | X25519 public key (Derived from  `xPrivKey`)                                | Montgomery       |
| `a`          | Clamped Edwards private scalar (derived from `xPrivKey`)                    | Edwards          |
| `A`          | Edwards public key (derived from `a`)                                       | Edwards          |
| `r`          | Deterministic nonce                                                         | Edwards          |
| `R`          | Nonce point (`R = r * B`)                                                   | Edwards          |
| `k`          | Challenge hash (`k = H(R ‖ A ‖ M)`, where `H` is SHA-512)                   |                  |
| `S`          | Signature scalar (`S = (r + k * a) mod L`)                                  | Edwards          |
| `L`          | Order of the curve (`2²⁵² + 27742317777372353535851937790883648493`)        |                  |
| `B`          | Basepoint (curve generator)                                                 | Edwards/Montgomery |


1. **Initial Key Conversion**:
   - Initially the 
3. **Signing Prekeys**:
   - Bob signs his `SPK_B` using his identity key:
     ```python
     signature = XEdDSA_sign(IK_B_private, SPK_B_public)
     ```
   - Alice verifies the signature:
     ```python
     assert XEdDSA_verify(IK_B_public, SPK_B_public, signature)
     ```

4. **Why It Matters**:
   - 🛡️ **Prevents MITM Attacks**: Ensures `SPK_B` truly belongs to Bob.
   - ⚡ **Efficient**: Fast Ed25519-based signatures.

---

# Setup

Install [**Rust**](https://rustup.rs/) with Rustup

Install `wasm-pack`
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

# References
[**Signal XEdDSA**](https://signal.org/docs/](https://signal.org/docs/specifications/xeddsa/))

[**RFC 8032 Ed25519**](https://signal.org/docs/](https://datatracker.ietf.org/doc/html/rfc8032)](https://datatracker.ietf.org/doc/html/rfc7748))

[**RFC 7748 Curve25519**](https://signal.org/docs/](https://datatracker.ietf.org/doc/html/rfc8032))
